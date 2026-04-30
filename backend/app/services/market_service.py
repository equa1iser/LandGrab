from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.market import MarketData
from app.services.data_sources.fred_adapter import FREDAdapter


class MarketService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_fetch(self, zip_code: str) -> Optional[dict]:
        result = await self.db.execute(
            select(MarketData).where(MarketData.geo_key == zip_code)
        )
        record = result.scalar_one_or_none()

        if record and record.expires_at and record.expires_at > datetime.utcnow():
            return self._to_dict(record)

        # Fetch interest rates from FRED
        fred_data = await FREDAdapter().get_interest_rates()
        rates = fred_data.get("rates", {})

        if not record:
            record = MarketData(geo_key=zip_code)
            self.db.add(record)

        if rates.get("30yr_fixed"):
            record.interest_rate_30yr = rates["30yr_fixed"].get("current")
        if rates.get("15yr_fixed"):
            record.interest_rate_15yr = rates["15yr_fixed"].get("current")
        if rates.get("5yr_arm"):
            record.interest_rate_5yr_arm = rates["5yr_arm"].get("current")

        record.raw_sources = {"fred": fred_data}
        record.fetched_at = datetime.utcnow()
        record.expires_at = datetime.utcnow() + timedelta(hours=1)
        await self.db.flush()

        return self._to_dict(record)

    def _to_dict(self, record: Optional[MarketData]) -> Optional[dict]:
        if not record:
            return None
        return {
            "median_price": record.median_price,
            "price_per_sqft": record.price_per_sqft,
            "median_days_on_market": record.median_days_on_market,
            "months_of_supply": record.months_of_supply,
            "sales_volume_30d": record.sales_volume_30d,
            "sales_volume_90d": record.sales_volume_90d,
            "yoy_price_change_pct": record.yoy_price_change_pct,
            "interest_rate_30yr": record.interest_rate_30yr,
            "interest_rate_15yr": record.interest_rate_15yr,
        }
