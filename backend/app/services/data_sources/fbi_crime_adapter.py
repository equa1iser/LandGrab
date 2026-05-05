from typing import Any, Optional
from datetime import datetime

from app.services.data_sources.base import BaseDataSource
from app.services.data_sources.http_client import create_client, retry_on_http_error
from app.core.redis_client import cache_get, cache_set, NEIGHBORHOOD_TTL
from app.core.config import settings

FBI_BASE = "https://api.usa.gov/crime/fbi/cde"


class FBICrimeAdapter(BaseDataSource):
    source_name = "fbi_crime"
    priority = 30

    async def get_crime_data(self, city: str, state: str) -> Optional[dict[str, Any]]:
        cache_key = f"fbi:crime:{state}:{city}".replace(" ", "_").lower()
        cached = await cache_get(cache_key)
        if cached:
            return cached

        async with create_client(FBI_BASE) as client:
            try:
                result = await self._fetch_offense_data(client, state)
                if result:
                    await cache_set(cache_key, result, ttl=NEIGHBORHOOD_TTL)
                    return result
            except Exception:
                return None
        return None

    async def _fetch_offense_data(self, client, state: str) -> Optional[dict]:
        # Fetch the last 12 months of rates for violent and property crime
        params: dict = {"from": "01-2022", "to": "12-2022"}
        if settings.FBI_CRIME_API_KEY:
            params["API_KEY"] = settings.FBI_CRIME_API_KEY

        state_upper = state.upper()
        violent_rate = await self._mean_monthly_rate(client, state_upper, "violent-crime", params)
        property_rate = await self._mean_monthly_rate(client, state_upper, "property-crime", params)

        if violent_rate is None and property_rate is None:
            return None

        # Combined annual rate per 100k (monthly mean × 12)
        monthly_combined = (violent_rate or 0) + (property_rate or 0)
        annual_rate = monthly_combined * 12

        # Normalize to 0-100 index; national avg ~2,700/yr per 100k
        crime_index = min(round((annual_rate / 5000) * 100, 1), 100)
        grade = self._index_to_grade(crime_index)

        return {
            "crime_index": crime_index,
            "crime_grade": grade,
            "crime_rate_per_100k": round(annual_rate, 1),
            "violent_rate_per_100k": round((violent_rate or 0) * 12, 1),
            "property_rate_per_100k": round((property_rate or 0) * 12, 1),
            "source": "FBI CDE",
            "state": state,
            "fetched_at": datetime.utcnow().isoformat(),
        }

    async def _mean_monthly_rate(self, client, state: str, offense: str, params: dict) -> Optional[float]:
        try:
            resp = await client.get(f"/summarized/state/{state}/{offense}", params=params)
            resp.raise_for_status()
            data = resp.json()
            rates_by_period: dict = {}
            for key, monthly in (data.get("offenses", {}).get("rates", {}) or {}).items():
                rates_by_period.update(monthly)
            if not rates_by_period:
                return None
            return sum(rates_by_period.values()) / len(rates_by_period)
        except Exception:
            return None

    def _index_to_grade(self, index: float) -> str:
        if index <= 20:
            return "A"
        if index <= 40:
            return "B"
        if index <= 60:
            return "C"
        if index <= 80:
            return "D"
        return "F"

    # Not a property data source
    async def get_property_details(self, address, city, state, zip_code):
        return None

    async def get_price_history(self, property_external_id):
        return []

    async def search_properties(self, **kwargs):
        return []
