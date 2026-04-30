from typing import Any, Optional
from datetime import datetime

from app.services.data_sources.base import BaseDataSource
from app.services.data_sources.http_client import create_client, retry_on_http_error
from app.core.redis_client import cache_get, cache_set, NEIGHBORHOOD_TTL

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

    @retry_on_http_error
    async def _fetch_offense_data(self, client, state: str) -> Optional[dict]:
        resp = await client.get(
            "/summarized/state/offenses",
            params={
                "state_abbr": state.upper(),
                "data_year": "2022",
            },
        )
        resp.raise_for_status()
        data = resp.json()

        if not data:
            return None

        # Compute a simple crime index from violent + property crime rates
        total_crimes = 0
        population = 0
        for entry in data:
            total_crimes += entry.get("actual", 0)
            population = max(population, entry.get("population", 0))

        if population == 0:
            return None

        crime_rate_per_100k = (total_crimes / population) * 100_000
        # Normalize to 0-100 index (national avg ~2,200 per 100k for violent + property)
        crime_index = min(round((crime_rate_per_100k / 5000) * 100, 1), 100)
        grade = self._index_to_grade(crime_index)

        result = {
            "crime_index": crime_index,
            "crime_grade": grade,
            "crime_rate_per_100k": round(crime_rate_per_100k, 1),
            "source": "FBI UCR",
            "state": state,
            "fetched_at": datetime.utcnow().isoformat(),
        }
        return result

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
