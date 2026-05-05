from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct
from sqlalchemy.orm import selectinload

from app.models.user import User, UserTier
from app.models.alert import SavedProperty, SavedSearch
from app.models.property import Property
from app.schemas.user import (
    AdminOverview, AdminUserStats, AdminPropertyStats, AdminApiUsage,
    AdminUserItem, AdminUserUpdate,
)
from app.core.redis_client import cache_get
from app.core.config import settings

RENTCAST_MONTHLY_QUOTA = 50
RENTCAST_QUOTA_KEY = "rentcast:monthly_calls"


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_overview(self) -> AdminOverview:
        now = datetime.utcnow()

        # User stats
        total = await self.db.scalar(select(func.count(User.id))) or 0
        active = await self.db.scalar(select(func.count(User.id)).where(User.is_active == True)) or 0
        verified = await self.db.scalar(select(func.count(User.id)).where(User.is_verified == True)) or 0
        pro = await self.db.scalar(
            select(func.count(User.id)).where(User.tier == UserTier.pro)
        ) or 0
        admins = await self.db.scalar(select(func.count(User.id)).where(User.is_admin == True)) or 0
        new_7d = await self.db.scalar(
            select(func.count(User.id)).where(User.created_at >= now - timedelta(days=7))
        ) or 0
        new_30d = await self.db.scalar(
            select(func.count(User.id)).where(User.created_at >= now - timedelta(days=30))
        ) or 0

        # Property stats
        total_props = await self.db.scalar(select(func.count(Property.id))) or 0
        source_rows = await self.db.execute(
            select(Property.source, func.count(Property.id)).group_by(Property.source)
        )
        sources = {row[0]: row[1] for row in source_rows}

        # API usage from Redis
        rentcast_calls = await cache_get(RENTCAST_QUOTA_KEY) or 0
        api_keys = {
            "rentcast": bool(settings.RENTCAST_API_KEY),
            "fred": bool(settings.FRED_API_KEY),
            "census": bool(settings.CENSUS_API_KEY),
            "fbi_crime": bool(settings.FBI_CRIME_API_KEY),
            "anthropic": bool(settings.ANTHROPIC_API_KEY),
            "attom": bool(settings.ATTOM_API_KEY),
            "api_ninjas": bool(settings.API_NINJAS_KEY),
        }

        return AdminOverview(
            users=AdminUserStats(
                total=total,
                active=active,
                verified=verified,
                pro=pro,
                admins=admins,
                new_7d=new_7d,
                new_30d=new_30d,
            ),
            properties=AdminPropertyStats(
                total_cached=total_props,
                sources=sources,
            ),
            api_usage=AdminApiUsage(
                rentcast_calls_this_month=int(rentcast_calls),
                rentcast_monthly_quota=RENTCAST_MONTHLY_QUOTA,
                api_keys_configured=api_keys,
            ),
        )

    async def get_users(self, page: int = 1, per_page: int = 20) -> tuple[list[AdminUserItem], int]:
        offset = (page - 1) * per_page
        total = await self.db.scalar(select(func.count(User.id))) or 0

        result = await self.db.execute(
            select(User)
            .options(selectinload(User.saved_properties), selectinload(User.saved_searches))
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        users = result.scalars().all()

        items = [
            AdminUserItem(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                tier=u.tier,
                is_active=u.is_active,
                is_admin=u.is_admin,
                is_verified=u.is_verified,
                created_at=u.created_at,
                saved_properties_count=len(u.saved_properties),
                saved_searches_count=len(u.saved_searches),
            )
            for u in users
        ]
        return items, total

    async def update_user(self, user_id: str, data: AdminUserUpdate) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return None

        if data.tier is not None:
            user.tier = data.tier
        if data.is_active is not None:
            user.is_active = data.is_active
        if data.is_admin is not None:
            user.is_admin = data.is_admin

        await self.db.commit()
        await self.db.refresh(user)
        return user
