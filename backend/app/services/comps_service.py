import math
import uuid
from typing import Optional
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.property import Property, PriceHistory, PriceEventType
from app.schemas.property import ComparableSale


def _haversine_miles(lat1, lng1, lat2, lng2) -> float:
    R = 3958.8  # Earth radius in miles
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


class CompsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_comps(self, property_id: str, limit: int = 5) -> list[ComparableSale]:
        subject = await self._get_property(property_id)
        if not subject:
            return []

        cutoff = date.today() - timedelta(days=90)

        # Find recent sales in same zip code
        result = await self.db.execute(
            select(Property, PriceHistory)
            .join(PriceHistory, PriceHistory.property_id == Property.id)
            .where(
                Property.zip_code == subject.zip_code,
                Property.id != subject.id,
                Property.property_type == subject.property_type,
                PriceHistory.event_type == PriceEventType.sale,
                PriceHistory.event_date >= cutoff,
            )
            .limit(50)
        )
        rows = result.all()

        candidates = []
        for prop, ph in rows:
            # Filter by sqft similarity (within 30%)
            if subject.sqft and prop.sqft:
                sqft_diff = abs(subject.sqft - prop.sqft) / subject.sqft
                if sqft_diff > 0.30:
                    continue

            # Calculate distance
            distance = None
            if subject.lat and subject.lng and prop.lat and prop.lng:
                distance = _haversine_miles(
                    float(subject.lat), float(subject.lng),
                    float(prop.lat), float(prop.lng),
                )
                if distance > 1.5:  # more than 1.5 miles away
                    continue

            similarity = self._similarity_score(subject, prop, distance)
            price_per_sqft = None
            if ph.price and prop.sqft:
                price_per_sqft = float(ph.price) / prop.sqft

            candidates.append((similarity, ComparableSale(
                address=prop.address_line1,
                city=prop.city,
                state=prop.state,
                price=ph.price,
                sqft=prop.sqft,
                beds=prop.beds,
                baths=prop.baths,
                sale_date=ph.event_date,
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
