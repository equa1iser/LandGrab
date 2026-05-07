import asyncio
import uuid
from datetime import datetime, timedelta, date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sql_delete
from sqlalchemy.orm import selectinload

from app.models.property import Property, PriceHistory, TaxHistory, PriceEventType
from app.models.deal_score import DealScore
from app.schemas.property import PropertyDetailResponse, PropertySummaryResponse, PropertyBase
from app.services.data_sources.registry import get_registry
from app.services.neighborhood_service import NeighborhoodService
from app.services.market_service import MarketService
from app.core.redis_client import DB_SEARCH_FRESHNESS, DB_ADDRESS_FRESHNESS


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

        existing_history = prop.price_history or []
        # Treat a single synthetic "listing"-source event as if there's no history —
        # we may now be able to extract real multi-point data from raw_data.
        synthetic_only = (
            len(existing_history) == 1
            and existing_history[0].source == "listing"
        )
        needs_price = not existing_history or synthetic_only
        needs_tax = not prop.tax_history

        # Only attempt the ATTOM lookup (slow, quota-limited) when needed.
        # RentCast properties have a slug external_id, not an ATTOM numeric ID.
        attom_id = None
        if needs_tax:  # ATTOM is useful for tax history; price history comes from raw_data
            if prop.source == "attom":
                attom_id = prop.external_id
            else:
                attom = self.registry.get("attom")
                if attom and await attom.is_available():
                    attom_data = await attom.get_property_details(
                        prop.address_line1, prop.city, prop.state, prop.zip_code
                    )
                    attom_id = attom_data.get("external_id") if attom_data else None

        async def _with_timeout(coro, seconds=12):
            try:
                return await asyncio.wait_for(coro, timeout=seconds)
            except Exception as exc:
                return exc

        neighborhood, market, raw_tax = await asyncio.gather(
            _with_timeout(self.neighborhood_service.get_or_fetch(prop.zip_code, prop.city, prop.state)),
            _with_timeout(self.market_service.get_or_fetch(prop.zip_code, prop.city, prop.state)),
            _with_timeout(self.registry.get_tax_history(attom_id, "attom")) if (needs_tax and attom_id) else _noop(),
        )

        tax_events = raw_tax if (needs_tax and attom_id and not isinstance(raw_tax, Exception)) else []

        # Build price history from raw_data['history'] (RentCast listing history).
        # Each key is a YYYY-MM-DD date; each value has a price and event metadata.
        # This covers all listing periods (initial list, price changes, re-lists).
        price_events: list[dict] = []
        if needs_price and prop.raw_data:
            raw_hist = prop.raw_data.get("history") or {}
            for date_str, ev in sorted(raw_hist.items()):
                ev_price = ev.get("price")
                if not ev_price:
                    continue
                price_events.append({
                    "price": ev_price,
                    "event_date": date_str,
                    "event_type": PriceEventType.list,
                    "source": "rentcast",
                })

        # Last resort: synthesize a single point from current_price if raw_data had nothing
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
            prop_id = prop.id
            prop_source = prop.source
            # Replace synthetic-only history with real raw_data events
            replace_price = synthetic_only and bool(price_events)
            await self._persist_history(prop_id, prop_source, price_events, tax_events, replace_price)
            # Expire all session state so the re-fetch hits the DB rather than the
            # identity map — without this, SQLAlchemy may return stale relationship data
            # from before the DELETE + INSERT within the same request.
            self.db.expire_all()
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
        replace_price: bool = False,
    ) -> None:
        if replace_price and price_events:
            # Wipe the old (synthetic) price history so we can insert real events
            await self.db.execute(sql_delete(PriceHistory).where(PriceHistory.property_id == prop_id))

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
        if baths:
            query = query.where(Property.baths >= baths)
        if property_type:
            query = query.where(Property.property_type == property_type)
        query = query.limit(limit)

        result = await self.db.execute(query)
        cached = result.scalars().all()

        cache_fresh = any(
            p.last_synced_at and (datetime.utcnow() - p.last_synced_at) < DB_SEARCH_FRESHNESS
            for p in cached
        )

        props: list[Property] = []
        if cached and cache_fresh:
            props = list(cached)
        else:
            # Cache is stale or empty — fetch from external source
            raw_results = await self.registry.search_properties(
                city=city, state=state, zip_code=zip_code,
                min_price=min_price, max_price=max_price,
                beds=beds, baths=baths, property_type=property_type, limit=limit,
            )
            for data in raw_results:
                prop = await self._upsert_property(data)
                if prop:
                    props.append(prop)

            # Fall back to stale cache if external fetch returned nothing
            if not props and cached:
                props = list(cached)

        score_map = await self._batch_scores([p.id for p in props])
        return [self._to_summary(p, score_map.get(p.id)) for p in props]

    async def _batch_scores(self, prop_ids: list) -> dict:
        if not prop_ids:
            return {}
        result = await self.db.execute(
            select(DealScore.property_id, DealScore.score, DealScore.created_at)
            .where(
                DealScore.property_id.in_(prop_ids),
                DealScore.expires_at > datetime.utcnow(),
            )
            .order_by(DealScore.created_at.desc())
        )
        score_map: dict = {}
        for row in result.all():
            if row.property_id not in score_map:
                score_map[row.property_id] = row.score
        return score_map

    def _to_summary(self, prop: Property, deal_score: Optional[int] = None) -> PropertySummaryResponse:
        resp = PropertySummaryResponse.model_validate(prop)
        resp.deal_score = deal_score
        return resp

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
            datetime.utcnow() - prop.last_synced_at < DB_ADDRESS_FRESHNESS
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
