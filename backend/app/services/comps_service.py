import math
import uuid
from typing import Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.property import Property
from app.schemas.property import ComparableSale


def _haversine_miles(lat1, lng1, lat2, lng2) -> float:
    R = 3958.8
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


class CompsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_comps(self, property_id: str, limit: int = 5, max_distance: float = 20.0) -> list[ComparableSale]:
        subject = await self._get_property(property_id)
        if not subject:
            return []

        # Find active listings in the same zip code with a price set.
        # We use current_price from the Property table directly — ATTOM trial plan
        # does not provide sale history, so joining on PriceHistory.sale events
        # would always return zero results.
        query = (
            select(Property)
            .where(
                Property.zip_code == subject.zip_code,
                Property.id != subject.id,
                Property.current_price.isnot(None),
            )
            .limit(100)
        )
        # Filter by property type when set on both sides
        if subject.property_type:
            query = query.where(Property.property_type == subject.property_type)

        result = await self.db.execute(query.limit(200))
        candidates_raw = result.scalars().all()

        candidates = []
        for prop in candidates_raw:
            if subject.sqft and prop.sqft:
                sqft_diff = abs(subject.sqft - prop.sqft) / subject.sqft
                if sqft_diff > 0.30:
                    continue

            distance = None
            if subject.lat and subject.lng and prop.lat and prop.lng:
                distance = _haversine_miles(
                    float(subject.lat), float(subject.lng),
                    float(prop.lat), float(prop.lng),
                )
                if distance > max_distance:
                    continue

            similarity = self._similarity_score(subject, prop, distance)
            price_per_sqft = None
            if prop.current_price and prop.sqft:
                price_per_sqft = float(prop.current_price) / prop.sqft

            list_date = prop.list_date or date.today()

            candidates.append((similarity, ComparableSale(
                address=prop.address_line1,
                city=prop.city,
                state=prop.state,
                price=prop.current_price,
                sqft=prop.sqft,
                beds=prop.beds,
                baths=prop.baths,
                sale_date=list_date,
                distance_miles=round(distance, 2) if distance else None,
                price_per_sqft=round(price_per_sqft, 2) if price_per_sqft else None,
                similarity_score=round(similarity, 2),
            )))

        candidates.sort(key=lambda x: x[0], reverse=True)
        return [comp for _, comp in candidates[:limit]]

    def _similarity_score(self, subject: Property, comp: Property, distance: Optional[float]) -> float:
        score = 100.0

        if subject.sqft and comp.sqft:
            sqft_diff = abs(subject.sqft - comp.sqft) / subject.sqft
            score -= sqft_diff * 50

        if distance is not None:
            score -= distance * 10

        if subject.beds and comp.beds:
            score -= abs(subject.beds - comp.beds) * 5

        if subject.year_built and comp.year_built:
            year_diff = abs(subject.year_built - comp.year_built)
            score -= min(year_diff * 0.5, 20)

        return max(score, 0.0)

    async def _get_property(self, property_id: str) -> Optional[Property]:
        try:
            uid = uuid.UUID(property_id)
            result = await self.db.execute(select(Property).where(Property.id == uid))
            return result.scalar_one_or_none()
        except ValueError:
            return None
