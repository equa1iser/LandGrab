from typing import Any, Optional
from datetime import datetime

from app.services.data_sources.base import BaseDataSource
from app.services.data_sources.http_client import create_client, retry_on_http_error
from app.core.config import settings
from app.core.redis_client import cache_get, cache_set, RATES_TTL

FRED_BASE = "https://api.stlouisfed.org/fred"

SERIES = {
    "30yr_fixed": "MORTGAGE30US",
    "15yr_fixed": "MORTGAGE15US",
    "5yr_arm": "MORTGAGE5US",
    "fed_funds": "FEDFUNDS",
    "case_shiller_national": "CSUSHPINSA",
}


class FREDAdapter(BaseDataSource):
    source_name = "fred"
    priority = 10

    async def get_interest_rates(self) -> dict[str, Any]:
        cache_key = "fred:interest_rates"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        if not settings.FRED_API_KEY:
            return self._fallback_rates()

        rates = {}
        async with create_client(FRED_BASE) as client:
            for rate_name, series_id in SERIES.items():
                try:
                    data = await self._fetch_series(client, series_id)
                    if data:
                        rates[rate_name] = data
                except Exception:
                    pass

        result = {
            "rates": rates,
            "source": "FRED",
            "fetched_at": datetime.utcnow().isoformat(),
        }
        await cache_set(cache_key, result, ttl=RATES_TTL)
        return result

    @retry_on_http_error
    async def _fetch_series(self, client, series_id: str) -> Optional[dict]:
        resp = await client.get(
            f"/series/observations",
            params={
                "series_id": series_id,
                "api_key": settings.FRED_API_KEY,
                "file_type": "json",
                "limit": 52,
                "sort_order": "desc",
            },
        )
        resp.raise_for_status()
        observations = resp.json().get("observations", [])
        valid = [o for o in observations if o["value"] != "."]
        if not valid:
            return None
        latest = valid[0]
        history = [
            {"date": o["date"], "value": float(o["value"])}
            for o in valid
            if o["value"] != "."
        ]
        return {
            "current": float(latest["value"]),
            "date": latest["date"],
            "history": history[:52],
        }

    def _fallback_rates(self) -> dict[str, Any]:
        """Returns placeholder rates when no API key is configured."""
        return {
            "rates": {
                "30yr_fixed": {"current": None, "date": None, "history": []},
                "15yr_fixed": {"current": None, "date": None, "history": []},
            },
            "source": "unavailable — add FRED_API_KEY to .env",
            "fetched_at": datetime.utcnow().isoformat(),
        }

    # Required abstract method implementations (FRED is rates-only)
    async def get_property_details(self, address, city, state, zip_code):
        return None

    async def get_price_history(self, property_external_id):
        return []

    async def search_properties(self, **kwargs):
        return []
