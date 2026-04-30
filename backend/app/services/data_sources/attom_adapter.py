from typing import Any, Optional

from app.services.data_sources.base import BaseDataSource
from app.services.data_sources.http_client import create_client, retry_on_http_error
from app.core.config import settings
from app.core.redis_client import cache_get, cache_set, PROPERTY_TTL

ATTOM_BASE = "https://api.developer.attomdata.com/propertyapi/v1.0.0"


class ATTOMAdapter(BaseDataSource):
    """
    ATTOM Data API adapter. Requires ATTOM_API_KEY in .env.
    https://api.developer.attomdata.com/home
    Sign up for 30-day trial at https://www.attomdata.com/
    """
    source_name = "attom"
    priority = 1  # Highest priority — most comprehensive data

    async def is_available(self) -> bool:
        return bool(settings.ATTOM_API_KEY)

    def _headers(self) -> dict:
        return {
            "apikey": settings.ATTOM_API_KEY,
            "Accept": "application/json",
        }

    async def get_property_details(
        self, address: str, city: str, state: str, zip_code: str
    ) -> Optional[dict[str, Any]]:
        if not settings.ATTOM_API_KEY:
            return None

        cache_key = f"attom:property:{address}:{zip_code}".replace(" ", "_").lower()
        cached = await cache_get(cache_key)
        if cached:
            return cached

        async with create_client(ATTOM_BASE, headers=self._headers()) as client:
            try:
                data = await self._fetch_detail(client, address, zip_code)
                if data:
                    normalized = self._normalize(data)
                    await cache_set(cache_key, normalized, ttl=PROPERTY_TTL)
                    return normalized
            except Exception:
                return None
        return None

    @retry_on_http_error
    async def _fetch_detail(self, client, address: str, zip_code: str) -> Optional[dict]:
        resp = await client.get(
            "/property/detail",
            params={"address1": address, "postalcode": zip_code},
        )
        resp.raise_for_status()
        data = resp.json()
        properties = data.get("property", [])
        return properties[0] if properties else None

    def _normalize(self, data: dict) -> dict:
        ident = data.get("identifier", {})
        summary = data.get("summary", {})
        building = data.get("building", {})
        lot = data.get("lot", {})
        address = data.get("address", {})
        sale = data.get("sale", {}).get("saleAmountData", {})

        return {
            "external_id": str(ident.get("attomId", "")),
            "source": self.source_name,
            "address_line1": address.get("line1", ""),
            "city": address.get("locality", ""),
            "state": address.get("countrySubd", ""),
            "zip_code": address.get("postal1", ""),
            "county": address.get("countyuse1"),
            "lat": address.get("latitude"),
            "lng": address.get("longitude"),
            "beds": building.get("rooms", {}).get("beds"),
            "baths": building.get("rooms", {}).get("bathstotal"),
            "sqft": building.get("size", {}).get("livingsize"),
            "lot_size_acres": lot.get("lotsize2"),
            "year_built": summary.get("yearbuilt"),
            "property_type": self._map_type(summary.get("proptype")),
            "current_price": sale.get("saleamt"),
            "raw_data": data,
        }

    def _map_type(self, ptype: Optional[str]) -> str:
        mapping = {
            "SFR": "single_family",
            "CONDO": "condo",
            "TOWNHOUSE": "townhouse",
            "MFR": "multi_family",
            "LAND": "land",
        }
        return mapping.get((ptype or "").upper(), "other")

    async def get_price_history(self, property_external_id: str) -> list[dict]:
        if not settings.ATTOM_API_KEY:
            return []

        async with create_client(ATTOM_BASE, headers=self._headers()) as client:
            try:
                resp = await client.get(
                    "/saleshistory/detail",
                    params={"id": property_external_id},
                )
                resp.raise_for_status()
                data = resp.json()
                history = []
                for sale in data.get("property", []):
                    for event in sale.get("saleHistory", []):
                        history.append({
                            "event_type": "sale",
                            "price": event.get("saleamt"),
                            "event_date": event.get("salerecdate"),
                            "source": self.source_name,
                        })
                return history
            except Exception:
                return []

    async def get_tax_history(self, property_external_id: str) -> list[dict]:
        if not settings.ATTOM_API_KEY:
            return []

        async with create_client(ATTOM_BASE, headers=self._headers()) as client:
            try:
                resp = await client.get(
                    "/assessment/detail",
                    params={"id": property_external_id},
                )
                resp.raise_for_status()
                data = resp.json()
                history = []
                for prop in data.get("property", []):
                    assessment = prop.get("assessment", {})
                    history.append({
                        "year": assessment.get("tax", {}).get("taxyear"),
                        "assessed_value": assessment.get("assessed", {}).get("assdttlvalue"),
                        "tax_amount": assessment.get("tax", {}).get("taxamt"),
                        "source": self.source_name,
                    })
                return history
            except Exception:
                return []

    async def search_properties(
        self,
        city=None, state=None, zip_code=None,
        min_price=None, max_price=None,
        beds=None, baths=None,
        property_type=None, limit=20,
    ) -> list[dict]:
        if not settings.ATTOM_API_KEY:
            return []

        params = {"pagesize": min(limit, 50)}
        if zip_code:
            params["postalcode"] = zip_code
        if city:
            params["address2"] = city
        if min_price:
            params["minSaleAmt"] = min_price
        if max_price:
            params["maxSaleAmt"] = max_price
        if beds:
            params["minBeds"] = beds

        async with create_client(ATTOM_BASE, headers=self._headers()) as client:
            try:
                resp = await client.get("/property/address", params=params)
                resp.raise_for_status()
                properties = resp.json().get("property", [])
                return [self._normalize(p) for p in properties]
            except Exception:
                return []
