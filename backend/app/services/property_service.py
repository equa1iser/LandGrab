import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.property import Property, PriceHistory, TaxHistory
from app.schemas.property import PropertyDetailResponse, PropertySummaryResponse, PropertyBase
from app.services.data_sources.registry import get_registry
from app.services.neighborhood_service import NeighborhoodService
from app.services.market_service import MarketService


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

        # Fetch supplemental data in parallel
        neighborhood, market = await asyncio.gather(
            self.neighborhood_service.get_or_fetch(prop.zip_code, prop.city, prop.state),
            self.market_service.get_or_fetch(prop.zip_code),
            return_exceptions=True,
        )

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
