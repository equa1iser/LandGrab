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
                return [
                    {
                        "display_name": r["display_name"],
                        "lat": float(r["lat"]),
                        "lng": float(r["lon"]),
                        "address": r.get("address", {}),
                    }
                    for r in results
                ]
            except Exception:
                return []
