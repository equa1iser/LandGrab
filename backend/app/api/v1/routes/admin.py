from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_admin_user
from app.models.user import User
from app.services.admin_service import AdminService
from app.schemas.user import AdminOverview, AdminUserItem, AdminUserUpdate, UserResponse

router = APIRouter()


@router.get("/overview", response_model=AdminOverview)
async def admin_overview(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return await AdminService(db).get_overview()


@router.get("/users", response_model=dict)
async def admin_list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    service = AdminService(db)
    items, total = await service.get_users(page=page, per_page=per_page)
    return {
        "items": [i.model_dump() for i in items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": -(-total // per_page),
    }


@router.patch("/users/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: str,
    data: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    service = AdminService(db)
    user = await service.update_user(user_id, data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
