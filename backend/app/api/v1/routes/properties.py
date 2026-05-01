from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.services.property_service import PropertyService
from app.schemas.property import PropertyDetailResponse, PropertySummaryResponse

router = APIRouter()


@router.get("", response_model=list[PropertySummaryResponse])
async def search_properties(
    address: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    zip_code: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    beds: Optional[int] = Query(None),
    baths: Optional[float] = Query(None),
    property_type: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    return await service.search(
        address=address, city=city, state=state, zip_code=zip_code,
        min_price=min_price, max_price=max_price, beds=beds, baths=baths,
        property_type=property_type, limit=limit,
    )


@router.get("/{property_id}", response_model=PropertyDetailResponse)
async def get_property(property_id: str, db: AsyncSession = Depends(get_db)):
    service = PropertyService(db)
    result = await service.get_detail(property_id)
    if not result:
        raise HTTPException(status_code=404, detail="Property not found")
    return result


@router.get("/{property_id}/score")
async def get_deal_score(property_id: str, db: AsyncSession = Depends(get_db)):
    from app.services.ai.deal_score_service import DealScoreService
    service = DealScoreService(db)
    result = await service.get_or_compute(property_id)
    if not result:
        raise HTTPException(status_code=404, detail="Property not found")
    return result


@router.get("/{property_id}/comps")
async def get_comps(
    property_id: str,
    max_distance: float = Query(20.0, ge=0.5, le=50.0),
    db: AsyncSession = Depends(get_db),
):
    from app.services.comps_service import CompsService
    service = CompsService(db)
    return await service.get_comps(property_id, max_distance=max_distance)


@router.get("/{property_id}/price-history")
async def get_price_history(property_id: str, db: AsyncSession = Depends(get_db)):
    service = PropertyService(db)
    return await service.get_price_history(property_id)


@router.get("/{property_id}/avm")
async def get_avm(property_id: str, db: AsyncSession = Depends(get_db)):
    from app.services.ai.valuation_model import LandGrabAVM
    avm = LandGrabAVM()
    return await avm.estimate(property_id, db)
