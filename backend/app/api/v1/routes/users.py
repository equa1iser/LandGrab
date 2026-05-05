from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.user import (
    UserResponse, UsageResponse,
    SavedPropertyCreate, SavedSearchCreate, SavedSearchUpdate,
    UserProfileUpdate, UserPasswordUpdate,
)

router = APIRouter()

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    return current_user


@router.get("/usage", response_model=UsageResponse)
async def get_usage(current_user: CurrentUser):
    from app.services.usage_service import get_usage as _get_usage
    from app.models.user import UserTier
    is_pro = current_user.tier == UserTier.pro
    return await _get_usage(str(current_user.id), is_pro)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserProfileUpdate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    from app.services.user_service import UserService
    service = UserService(db)
    return await service.update_profile(current_user, data)


@router.put("/preferences", response_model=UserResponse)
async def update_preferences(
    prefs: dict, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    from app.services.user_service import UserService
    service = UserService(db)
    return await service.update_preferences(current_user, prefs)


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    data: UserPasswordUpdate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    from app.services.user_service import UserService
    service = UserService(db)
    ok = await service.change_password(current_user, data)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")


@router.get("/saved-properties")
async def list_saved_properties(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    from app.services.user_service import UserService
    service = UserService(db)
    return await service.list_saved_properties(current_user.id)


@router.post("/saved-properties", status_code=status.HTTP_201_CREATED)
async def save_property(
    data: SavedPropertyCreate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    from app.services.user_service import UserService
    service = UserService(db)
    return await service.save_property(current_user.id, data)


@router.delete("/saved-properties/{saved_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_saved_property(
    saved_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    from app.services.user_service import UserService
    service = UserService(db)
    await service.remove_saved_property(current_user.id, saved_id)


@router.get("/saved-searches")
async def list_saved_searches(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    from app.services.user_service import UserService
    service = UserService(db)
    return await service.list_saved_searches(current_user.id)


@router.post("/saved-searches", status_code=status.HTTP_201_CREATED)
async def create_saved_search(
    data: SavedSearchCreate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    from app.services.user_service import UserService
    service = UserService(db)
    return await service.create_saved_search(current_user.id, data)


@router.put("/saved-searches/{search_id}")
async def update_saved_search(
    search_id: str,
    data: SavedSearchUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    from app.services.user_service import UserService
    service = UserService(db)
    result = await service.update_saved_search(current_user.id, search_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return result


@router.delete("/saved-searches/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_search(
    search_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    from app.services.user_service import UserService
    service = UserService(db)
    await service.delete_saved_search(current_user.id, search_id)
