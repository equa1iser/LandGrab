from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


@router.get("/autocomplete")
async def autocomplete(q: str = Query(..., min_length=2)):
    from app.services.geocoding_service import GeocodingService
    service = GeocodingService()
    return await service.autocomplete(q)
