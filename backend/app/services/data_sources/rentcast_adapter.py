from typing import Any, Optional
from datetime import datetime

from app.services.data_sources.base import BaseDataSource, QuotaExceededException
from app.services.data_sources.http_client import create_client, retry_on_http_error
from app.core.config import settings
from app.core.redis_client import cache_get, cache_set, cache_incr, cache_expire, PROPERTY_TTL

RENTCAST_BASE = "https://api.rentcast.io/v1"
MONTHLY_QUOTA = 50
QUOTA_KEY = "rentcast:monthly_calls"


class RentCastAdapter(BaseDataSource):
    source_name = "rentcast"
    priority = 50

    async def _check_quota(self):
        count = await cache_get(QUOTA_KEY) or 0
        if int(count) >= MONTHLY_QUOTA:
            raise QuotaExceededException(f"RentCast monthly quota ({MONTHLY_QUOTA}) reached")

    async def _increment_quota(self):
        count = await cache_incr(QUOTA_KEY)
        if count == 1:
            # First call this month — set TTL to ~31 days
            await cache_expire(QUOTA_KEY, 31 * 24 * 3600)

    async def get_property_details(
        self, address: str, city: str, state: str, zip_code: str
    ) -> Optional[dict[str, Any]]:
        if not settings.RENTCAST_API_KEY:
            return None

        cache_key = f"rentcast:property:{address}:{zip_code}".replace(" ", "_").lower()
        cached = await cache_get(cache_key)
        if cached:
            return cached

        await self._check_quota()
        full_address = f"{address}, {city}, {state} {zip_code}"

        async with create_client(RENTCAST_BASE, headers={"X-Api-Key": settings.RENTCAST_API_KEY}) as client:
            try:
                data = await self._fetch_property(client, full_address)
                if data:
                    normalized = self._normalize(data)
                    await cache_set(cache_key, normalized, ttl=PROPERTY_TTL)
                    await self._increment_quota()
                    return normalized
            except QuotaExceededException:
                raise
            except Exception:
                return None
        return None

    @retry_on_http_error
    async def _fetch_property(self, client, full_address: str) -> Optional[dict]:
        resp = await client.get(
            "/properties",
            params={"address": full_address},
        )
        resp.raise_for_status()
        results = resp.json()
        return results[0] if isinstance(results, list) and results else None

    def _normalize(self, data: dict) -> dict:
        return {
            "external_id": data.get("id"),
            "source": self.source_name,
            "address_line1": data.get("addressLine1", ""),
            "city": data.get("city", ""),
            "state": data.get("state", ""),
            "zip_code": data.get("zipCode", ""),
            "county": data.get("county"),
            "lat": data.get("latitude"),
            "lng": data.get("longitude"),
            "beds": data.get("bedrooms"),
            "baths": data.get("bathrooms"),
            "sqft": data.get("squareFootage"),
            "lot_size_acres": data.get("lotSize"),
            "year_built": data.get("yearBuilt"),
            "property_type": self._map_type(data.get("propertyType")),
            "current_price": data.get("price"),
            "days_on_market": data.get("daysOnMarket"),
            "raw_data": data,
        }

    def _map_type(self, ptype: Optional[str]) -> str:
        mapping = {
            "Single Family": "single_family",
            "Condo": "condo",
            "Townhouse": "townhouse",
            "Multi-Family": "multi_family",
            "Land": "land",
        }
        return mapping.get(ptype, "other") if ptype else "other"

    async def get_price_history(self, property_external_id: str) -> list[dict]:
        return []

    async def get_market_stats(
        self, zip_code: str = None, city: str = None, state: str = None
    ) -> dict:
        # /markets requires zipCode — skip if not available
        if not settings.RENTCAST_API_KEY or not zip_code:
            return {}

        cache_key = f"rentcast:market:{zip_code}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        await self._check_quota()
        async with create_client(RENTCAST_BASE, headers={"X-Api-Key": settings.RENTCAST_API_KEY}) as client:
            try:
                resp = await client.get("/markets", params={"zipCode": zip_code})
                resp.raise_for_status()
                await self._increment_quota()
                sale = resp.json().get("saleData", {})
                result = {
                    "median_price": sale.get("medianPrice"),
                    "price_per_sqft": sale.get("medianPricePerSquareFoot"),
                    "median_days_on_market": sale.get("medianDaysOnMarket"),
                    "sales_volume_30d": sale.get("totalListings"),
                }
                await cache_set(cache_key, result, ttl=24 * 3600)
                return result
            except Exception:
                return {}

    def _normalize_listing(self, data: dict) -> dict:
        """Normalize a /listings/sale response (includes asking price)."""
        raw_address = data.get("formattedAddress", "")
        address_line1 = data.get("addressLine1") or (raw_address.split(",")[0].strip() if raw_address else "")
        return {
            "external_id": data.get("id"),
            "source": self.source_name,
            "address_line1": address_line1,
            "city": data.get("city", ""),
            "state": data.get("state", ""),
            "zip_code": data.get("zipCode", ""),
            "county": data.get("county"),
            "lat": data.get("latitude"),
            "lng": data.get("longitude"),
            "beds": data.get("bedrooms"),
            "baths": data.get("bathrooms"),
            "sqft": data.get("squareFootage"),
            "year_built": data.get("yearBuilt"),
            "property_type": self._map_type(data.get("propertyType")),
            "current_price": data.get("price"),
            "days_on_market": data.get("daysOnMarket"),
            "raw_data": data,
        }

    async def search_properties(
        self,
        city=None, state=None, zip_code=None,
        min_price=None, max_price=None,
        beds=None, baths=None,
        property_type=None, limit=20,
    ) -> list[dict]:
        if not settings.RENTCAST_API_KEY:
            return []

        await self._check_quota()
        params = {"limit": min(limit, 50), "status": "Active"}
        if zip_code:
            params["zipCode"] = zip_code
        if city:
            params["city"] = city
        if state:
            params["state"] = state
        if min_price:
            params["minPrice"] = min_price
        if max_price:
            params["maxPrice"] = max_price
        if beds:
            params["bedrooms"] = beds

        async with create_client(RENTCAST_BASE, headers={"X-Api-Key": settings.RENTCAST_API_KEY}) as client:
            try:
                # /listings/sale returns active listings with asking prices
                resp = await client.get("/listings/sale", params=params)
                resp.raise_for_status()
                await self._increment_quota()
                return [self._normalize_listing(p) for p in resp.json()]
            except Exception:
                # Fall back to property records (no prices, but still useful for the map)
                try:
                    params.pop("status", None)
                    resp = await client.get("/properties", params=params)
                    resp.raise_for_status()
                    return [self._normalize(p) for p in resp.json()]
                except Exception:
                    return []
