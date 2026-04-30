from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.get("/rates/current")
async def get_current_rates():
    from app.services.data_sources.fred_adapter import FREDAdapter
    adapter = FREDAdapter()
    return await adapter.get_interest_rates()


@router.get("/{zip_code}")
async def get_market_data(zip_code: str, db: AsyncSession = Depends(get_db)):
    from app.services.market_service import MarketService
    service = MarketService(db)
    return await service.get_or_fetch(zip_code)
