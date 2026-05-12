from typing import Any
from app.services.data_sources.http_client import create_client


class GeocodingService:
    """Uses Nominatim (OpenStreetMap) for address autocomplete — completely free."""

    async def autocomplete(self, query: str) -> list[dict[str, Any]]:
        async with create_client("https://nominatim.openstreetmap.org") as client:
            try:
                resp = await client.get(
                    "/search",
                    params={
                        "q": query,
                        "format": "json",
                        "countrycodes": "us",
                        "addressdetails": 1,
                        "limit": 8,
                        "featuretype": "house,street",
                    },
                    headers={"User-Agent": "LandGrab/1.0 (landgrab.io)"},
                )
                resp.raise_for_status()
                results = resp.json()
                items = []
                for r in results:
                    addr = r.get("address", {})
                    city = (
                        addr.get("city") or addr.get("town") or
                        addr.get("village") or addr.get("municipality") or ""
                    )
                    # ISO3166-2-lvl4 is "US-OK" — extract the two-letter abbreviation
                    iso = addr.get("ISO3166-2-lvl4", "")
                    state_abbr = iso.split("-")[-1] if "-" in iso else ""
                    items.append({
                        "display_name": r["display_name"],
                        "lat": float(r["lat"]),
                        "lng": float(r["lon"]),
                        "city": city,
                        "state_abbr": state_abbr,
                    })
                return items
            except Exception:
                return []
