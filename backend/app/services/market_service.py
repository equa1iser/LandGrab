from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.market import MarketData
from app.services.data_sources.fred_adapter import FREDAdapter
from app.services.data_sources.rentcast_adapter import RentCastAdapter


class MarketService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_fetch(self, zip_code: str, city: str = None, state: str = None) -> Optional[dict]:
        result = await self.db.execute(
            select(MarketData).where(MarketData.geo_key == zip_code)
        )
        record = result.scalar_one_or_none()

        if record and record.expires_at and record.expires_at > datetime.utcnow():
            return self._to_dict(record)

        # Fetch FRED interest rates and RentCast market stats in parallel
        import asyncio
        fred_data, market_stats = await asyncio.gather(
            FREDAdapter().get_interest_rates(),
            RentCastAdapter().get_market_stats(zip_code=zip_code, city=city, state=state),
            return_exceptions=True,
        )
        if isinstance(fred_data, Exception):
            fred_data = {}
        if isinstance(market_stats, Exception):
            market_stats = {}

        rates = fred_data.get("rates", {}) if isinstance(fred_data, dict) else {}

        if not record:
            record = MarketData(geo_key=zip_code)
            self.db.add(record)

        if rates.get("30yr_fixed"):
            record.interest_rate_30yr = rates["30yr_fixed"].get("current")
        if rates.get("15yr_fixed"):
            record.interest_rate_15yr = rates["15yr_fixed"].get("current")
        if rates.get("5yr_arm"):
            record.interest_rate_5yr_arm = rates["5yr_arm"].get("current")

        if isinstance(market_stats, dict):
            if market_stats.get("median_price"):
                record.median_price = market_stats["median_price"]
            if market_stats.get("price_per_sqft"):
                record.price_per_sqft = market_stats["price_per_sqft"]
            if market_stats.get("median_days_on_market") is not None:
                record.median_days_on_market = market_stats["median_days_on_market"]
            if market_stats.get("months_of_supply") is not None:
                record.months_of_supply = market_stats["months_of_supply"]
            if market_stats.get("sales_volume_30d") is not None:
                record.sales_volume_30d = market_stats["sales_volume_30d"]
            if market_stats.get("yoy_price_change_pct") is not None:
                record.yoy_price_change_pct = market_stats["yoy_price_change_pct"]

        record.raw_sources = {"fred": fred_data, "rentcast": market_stats}
        record.fetched_at = datetime.utcnow()
        record.expires_at = datetime.utcnow() + timedelta(hours=24)
        await self.db.commit()

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
            "mom_price_change_pct": record.mom_price_change_pct,
            "interest_rate_30yr": record.interest_rate_30yr,
            "interest_rate_15yr": record.interest_rate_15yr,
            "interest_rate_5yr_arm": record.interest_rate_5yr_arm,
        }
