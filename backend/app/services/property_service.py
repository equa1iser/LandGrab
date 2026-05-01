import asyncio
import uuid
from datetime import datetime, timedelta, date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.property import Property, PriceHistory, TaxHistory, PriceEventType
from app.schemas.property import PropertyDetailResponse, PropertySummaryResponse, PropertyBase
from app.services.data_sources.registry import get_registry
from app.services.neighborhood_service import NeighborhoodService
from app.services.market_service import MarketService


async def _noop():
    return []


class PropertyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.registry = get_registry()
        self.neighborhood_service = NeighborhoodService(db)
        self.market_service = MarketService(db)

    async def get_detail(self, property_id: str) -> Optional[PropertyDetailResponse]:
        prop = await self._get_by_id(property_id)
        if not prop:
            return None

        needs_price = not prop.price_history
        needs_tax = not prop.tax_history

        # Resolve an ATTOM ID for history lookups.
        # RentCast properties have a slug external_id, not an ATTOM numeric ID.
        # Do an address-based ATTOM lookup first to get the real attomId.
        attom_id = None
        if needs_price or needs_tax:
            if prop.source == "attom":
                attom_id = prop.external_id
            else:
                attom = self.registry.get("attom")
                if attom and await attom.is_available():
                    attom_data = await attom.get_property_details(
                        prop.address_line1, prop.city, prop.state, prop.zip_code
                    )
                    attom_id = attom_data.get("external_id") if attom_data else None

        neighborhood, market, raw_price, raw_tax = await asyncio.gather(
            self.neighborhood_service.get_or_fetch(prop.zip_code, prop.city, prop.state),
            self.market_service.get_or_fetch(prop.zip_code, prop.city, prop.state),
            self.registry.get_price_history(attom_id, "attom") if (needs_price and attom_id) else _noop(),
            self.registry.get_tax_history(attom_id, "attom") if (needs_tax and attom_id) else _noop(),
            return_exceptions=True,
        )

        price_events = raw_price if (needs_price and attom_id and not isinstance(raw_price, Exception)) else []
        tax_events = raw_tax if (needs_tax and attom_id and not isinstance(raw_tax, Exception)) else []

        # ATTOM trial plan returns empty saleHistory. Synthesize a listing event from
        # the current asking price so the price history chart has at least one data point.
        if needs_price and not price_events and prop.current_price:
            derived_date = (
                prop.list_date
                or (date.today() - timedelta(days=int(prop.days_on_market or 0)))
            )
            price_events = [{
                "price": prop.current_price,
                "event_date": derived_date,
                "event_type": PriceEventType.list,
                "source": "listing",
            }]

        if price_events or tax_events:
            # Extract identity columns before any commit — commit expires the ORM object,
            # and accessing attributes afterwards triggers a lazy load (MissingGreenlet).
            prop_id = prop.id
            prop_source = prop.source
            await self._persist_history(prop_id, prop_source, price_events, tax_events)
            prop = await self._get_by_id(property_id)

        from app.schemas.property import NeighborhoodSummary, MarketSummary
        n_data = None
        if neighborhood and not isinstance(neighborhood, Exception):
            n_data = NeighborhoodSummary.model_validate(neighborhood)

        m_data = None
        if market and not isinstance(market, Exception) and isinstance(market, dict):
            m_data = MarketSummary.model_validate(market)

        from app.schemas.property import PriceEvent, TaxRecord
        return PropertyDetailResponse(
            property=PropertyBase.model_validate(prop),
            price_history=[PriceEvent.model_validate(ph) for ph in prop.price_history],
            tax_history=[TaxRecord.model_validate(th) for th in prop.tax_history],
            neighborhood=n_data,
            market=m_data,
        )

    async def _persist_history(
        self,
        prop_id: uuid.UUID,
        prop_source: str,
        price_events: list[dict],
        tax_events: list[dict],
    ) -> None:
        for ev in price_events:
            price = ev.get("price")
            raw_date = ev.get("event_date")
            if not price or not raw_date:
                continue
            try:
                event_date = (
                    datetime.strptime(raw_date[:10], "%Y-%m-%d").date()
                    if isinstance(raw_date, str) else raw_date
                )
            except (ValueError, TypeError):
                continue
            event_type = ev.get("event_type", PriceEventType.sale)
            if isinstance(event_type, str):
                event_type = PriceEventType(event_type)
            self.db.add(PriceHistory(
                property_id=prop_id,
                event_type=event_type,
                price=price,
                event_date=event_date,
                source=ev.get("source", prop_source),
            ))

        for ev in tax_events:
            year = ev.get("year")
            if not year:
                continue
            try:
                year = int(year)
            except (ValueError, TypeError):
                continue
            self.db.add(TaxHistory(
                property_id=prop_id,
                year=year,
                assessed_value=ev.get("assessed_value"),
                tax_amount=ev.get("tax_amount"),
                source=ev.get("source", prop_source),
            ))

        await self.db.commit()

    async def search(
        self,
        address=None, city=None, state=None, zip_code=None,
        min_price=None, max_price=None, beds=None, baths=None,
        property_type=None, limit=20,
    ) -> list[PropertySummaryResponse]:
        # First check our DB cache
        query = select(Property)
        if zip_code:
            query = query.where(Property.zip_code == zip_code)
        elif city and state:
            query = query.where(Property.city.ilike(city), Property.state == state.upper())
        if min_price:
            query = query.where(Property.current_price >= min_price)
        if max_price:
            query = query.where(Property.current_price <= max_price)
        if beds:
            query = query.where(Property.beds >= beds)
        if property_type:
            query = query.where(Property.property_type == property_type)
        query = query.limit(limit)

        result = await self.db.execute(query)
        cached = result.scalars().all()

        if cached:
            return [PropertySummaryResponse.model_validate(p) for p in cached]

        # Fall back to external data source
        results = await self.registry.search_properties(
            city=city, state=state, zip_code=zip_code,
            min_price=min_price, max_price=max_price,
            beds=beds, baths=baths, property_type=property_type, limit=limit,
        )

        properties = []
        for data in results:
            prop = await self._upsert_property(data)
            if prop:
                properties.append(PropertySummaryResponse.model_validate(prop))

        return properties

    async def get_price_history(self, property_id: str) -> list:
        prop = await self._get_by_id(property_id)
        if not prop:
            return []
        return prop.price_history

    async def _get_by_id(self, property_id: str) -> Optional[Property]:
        try:
            uid = uuid.UUID(property_id)
            result = await self.db.execute(
                select(Property)
                .options(
                    selectinload(Property.price_history),
                    selectinload(Property.tax_history),
                )
                .where(Property.id == uid)
            )
            return result.scalar_one_or_none()
        except (ValueError, Exception):
            return None

    async def get_or_fetch_by_address(
        self, address: str, city: str, state: str, zip_code: str
    ) -> Optional[Property]:
        result = await self.db.execute(
            select(Property).where(
                Property.address_line1.ilike(address),
                Property.zip_code == zip_code,
            )
        )
        prop = result.scalar_one_or_none()

        if prop and prop.last_synced_at and (
            datetime.utcnow() - prop.last_synced_at < timedelta(hours=1)
        ):
            return prop

        data = await self.registry.get_property_details(address, city, state, zip_code)
        if data:
            return await self._upsert_property(data)

        return prop

    async def _upsert_property(self, data: dict) -> Optional[Property]:
        if not data:
            return None

        external_id = data.get("external_id")
        address = data.get("address_line1", "")
        zip_code = data.get("zip_code", "")

        prop = None
        if external_id:
            result = await self.db.execute(
                select(Property).where(Property.external_id == external_id)
            )
            prop = result.scalar_one_or_none()

        if not prop and address and zip_code:
            result = await self.db.execute(
                select(Property).where(
                    Property.address_line1.ilike(address),
                    Property.zip_code == zip_code,
                )
            )
            prop = result.scalar_one_or_none()

        if not prop:
            prop = Property()
            self.db.add(prop)

        for field in [
            "external_id", "source", "address_line1", "city", "state", "zip_code",
            "county", "lat", "lng", "beds", "baths", "sqft", "lot_size_acres",
            "year_built", "property_type", "current_price", "days_on_market",
            "description", "photo_urls", "raw_data",
        ]:
            if field in data and data[field] is not None:
                setattr(prop, field, data[field])

        prop.last_synced_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(prop)
        return prop
