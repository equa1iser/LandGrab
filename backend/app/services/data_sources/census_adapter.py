from typing import Any, Optional
from datetime import datetime

from app.services.data_sources.base import BaseDataSource
from app.services.data_sources.http_client import create_client, retry_on_http_error
from app.core.config import settings
from app.core.redis_client import cache_get, cache_set, NEIGHBORHOOD_TTL

CENSUS_BASE = "https://api.census.gov/data"

# ACS 5-Year variables: https://api.census.gov/data/2022/acs/acs5/variables.html
ACS_VARIABLES = {
    "B19013_001E": "median_household_income",
    "B25077_001E": "median_home_value",
    "B01003_001E": "total_population",
    "B25003_002E": "owner_occupied_units",
    "B25003_003E": "renter_occupied_units",
    "B25001_001E": "total_housing_units",
    "B25035_001E": "median_year_structure_built",
    "B15003_022E": "bachelors_degree",
    "B15003_023E": "masters_degree",
    "B15003_025E": "doctorate_degree",
}


class CensusAdapter(BaseDataSource):
    source_name = "census"
    priority = 20

    async def get_demographics(self, zip_code: str) -> Optional[dict[str, Any]]:
        cache_key = f"census:zip:{zip_code}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        if not settings.CENSUS_API_KEY:
            return None

        variables = ",".join(ACS_VARIABLES.keys())
        async with create_client(CENSUS_BASE) as client:
            try:
                result = await self._fetch_acs(client, zip_code, variables)
                if result:
                    await cache_set(cache_key, result, ttl=NEIGHBORHOOD_TTL)
                    return result
            except Exception:
                return None
        return None

    @retry_on_http_error
    async def _fetch_acs(self, client, zip_code: str, variables: str) -> Optional[dict]:
        resp = await client.get(
            "/2022/acs/acs5",
            params={
                "get": variables,
                "for": f"zip code tabulation area:{zip_code}",
                "key": settings.CENSUS_API_KEY,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        if len(data) < 2:
            return None

        headers = data[0]
        values = data[1]
        raw = dict(zip(headers, values))

        # Normalize to friendly names
        total_pop = int(raw.get("B01003_001E", 0) or 0)
        owner = int(raw.get("B25003_002E", 0) or 0)
        renter = int(raw.get("B25003_003E", 0) or 0)
        total_units = int(raw.get("B25001_001E", 1) or 1)

        def safe_float(val):
            try:
                v = float(val)
                return v if v > 0 else None
            except (TypeError, ValueError):
                return None

        return {
            "zip_code": zip_code,
            "median_household_income": safe_float(raw.get("B19013_001E")),
            "median_home_value": safe_float(raw.get("B25077_001E")),
            "total_population": total_pop,
            "owner_occupied_pct": round(owner / total_units * 100, 1) if total_units > 0 else None,
            "total_housing_units": total_units,
            "median_year_built": safe_float(raw.get("B25035_001E")),
            "source": "Census ACS 5-Year",
            "fetched_at": datetime.utcnow().isoformat(),
            "raw": raw,
        }

    # Property methods not applicable for Census
    async def get_property_details(self, address, city, state, zip_code):
        return None

    async def get_price_history(self, property_external_id):
        return []

    async def search_properties(self, **kwargs):
        return []
