import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, Optional

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User, UserTier
from app.services.property_service import PropertyService
from app.schemas.property import PropertyDetailResponse, PropertySummaryResponse

router = APIRouter()

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[PropertySummaryResponse])
async def search_properties(
    current_user: CurrentUser,
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
    lat_min: Optional[float] = Query(None),
    lat_max: Optional[float] = Query(None),
    lng_min: Optional[float] = Query(None),
    lng_max: Optional[float] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    return await service.search(
        address=address, city=city, state=state, zip_code=zip_code,
        min_price=min_price, max_price=max_price, beds=beds, baths=baths,
        property_type=property_type, limit=limit,
        lat_min=lat_min, lat_max=lat_max, lng_min=lng_min, lng_max=lng_max,
    )


@router.get("/{property_id}", response_model=PropertyDetailResponse)
async def get_property(
    property_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    result = await service.get_detail(property_id)
    if not result:
        raise HTTPException(status_code=404, detail="Property not found")

    try:
        from app.services.usage_service import track_view
        is_pro = current_user.tier == UserTier.pro
        await track_view(str(current_user.id), property_id, is_pro)
    except Exception as exc:
        logger.warning("track_view failed", extra={"property_id": property_id, "error": str(exc)})

    return result


@router.get("/{property_id}/score")
async def get_deal_score(
    property_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    from app.services.ai.deal_score_service import DealScoreService
    service = DealScoreService(db)
    result = await service.get_or_compute(property_id)
    if not result:
        raise HTTPException(status_code=404, detail="Property not found")
    return result


@router.get("/{property_id}/comps")
async def get_comps(
    property_id: str,
    current_user: CurrentUser,
    max_distance: float = Query(20.0, ge=0.5, le=50.0),
    db: AsyncSession = Depends(get_db),
):
    from app.services.comps_service import CompsService
    service = CompsService(db)
    return await service.get_comps(property_id, max_distance=max_distance)


@router.get("/{property_id}/price-history")
async def get_price_history(
    property_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    return await service.get_price_history(property_id)


@router.get("/{property_id}/avm")
async def get_avm(
    property_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    from app.services.ai.valuation_model import LandGrabAVM
    avm = LandGrabAVM()
    return await avm.estimate(property_id, db)
