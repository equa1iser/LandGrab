import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.alert import SavedProperty, SavedSearch
from app.models.user import User
from app.models.property import Property
from app.schemas.user import SavedPropertyCreate, SavedSearchCreate, SavedSearchUpdate, UserProfileUpdate, UserPasswordUpdate, UserPreferences


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_saved_properties(self, user_id: uuid.UUID) -> list[dict]:
        result = await self.db.execute(
            select(SavedProperty, Property)
            .join(Property, Property.id == SavedProperty.property_id)
            .where(SavedProperty.user_id == user_id)
        )
        rows = result.all()
        return [
            {
                "id": str(sp.id),
                "property_id": str(sp.property_id),
                "address": prop.address_line1,
                "city": prop.city,
                "state": prop.state,
                "zip_code": prop.zip_code,
                "beds": prop.beds,
                "baths": float(prop.baths) if prop.baths else None,
                "sqft": prop.sqft,
                "current_price": float(prop.current_price) if prop.current_price else None,
                "price_snapshot": sp.price_snapshot,
                "notes": sp.notes,
                "alert_enabled": sp.alert_enabled,
                "created_at": sp.created_at.isoformat(),
            }
            for sp, prop in rows
        ]

    async def save_property(self, user_id: uuid.UUID, data: SavedPropertyCreate) -> dict:
        prop_id = uuid.UUID(data.property_id)
        result = await self.db.execute(
            select(SavedProperty).where(
                SavedProperty.user_id == user_id,
                SavedProperty.property_id == prop_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return {"id": str(existing.id), "message": "already saved"}

        prop_result = await self.db.execute(select(Property).where(Property.id == prop_id))
        prop = prop_result.scalar_one_or_none()

        sp = SavedProperty(
            user_id=user_id,
            property_id=prop_id,
            price_snapshot=float(prop.current_price) if prop and prop.current_price else None,
            notes=data.notes,
            alert_enabled=data.alert_enabled,
        )
        self.db.add(sp)
        await self.db.commit()
        return {"id": str(sp.id), "message": "saved"}

    async def remove_saved_property(self, user_id: uuid.UUID, saved_id: str):
        result = await self.db.execute(
            select(SavedProperty).where(
                SavedProperty.id == uuid.UUID(saved_id),
                SavedProperty.user_id == user_id,
            )
        )
        sp = result.scalar_one_or_none()
        if sp:
            await self.db.delete(sp)
            await self.db.commit()

    async def list_saved_searches(self, user_id: uuid.UUID) -> list[dict]:
        result = await self.db.execute(
            select(SavedSearch).where(SavedSearch.user_id == user_id)
        )
        searches = result.scalars().all()
        return [
            {
                "id": str(s.id),
                "name": s.name,
                "search_params": s.search_params,
                "alert_enabled": s.alert_enabled,
                "alert_frequency": s.alert_frequency,
                "last_alerted_at": s.last_alerted_at.isoformat() if s.last_alerted_at else None,
                "created_at": s.created_at.isoformat(),
            }
            for s in searches
        ]

    async def create_saved_search(self, user_id: uuid.UUID, data: SavedSearchCreate) -> dict:
        ss = SavedSearch(
            user_id=user_id,
            name=data.name,
            search_params=data.search_params,
            alert_enabled=data.alert_enabled,
            alert_frequency=data.alert_frequency,
        )
        self.db.add(ss)
        await self.db.commit()
        return {"id": str(ss.id), "name": ss.name}

    async def update_saved_search(
        self, user_id: uuid.UUID, search_id: str, data: SavedSearchUpdate
    ) -> Optional[dict]:
        result = await self.db.execute(
            select(SavedSearch).where(
                SavedSearch.id == uuid.UUID(search_id),
                SavedSearch.user_id == user_id,
            )
        )
        ss = result.scalar_one_or_none()
        if not ss:
            return None
        if data.name is not None:
            ss.name = data.name
        if data.search_params is not None:
            ss.search_params = data.search_params
        if data.alert_enabled is not None:
            ss.alert_enabled = data.alert_enabled
        if data.alert_frequency is not None:
            ss.alert_frequency = data.alert_frequency
        await self.db.commit()
        return {"id": str(ss.id), "name": ss.name}

    async def delete_saved_search(self, user_id: uuid.UUID, search_id: str):
        result = await self.db.execute(
            select(SavedSearch).where(
                SavedSearch.id == uuid.UUID(search_id),
                SavedSearch.user_id == user_id,
            )
        )
        ss = result.scalar_one_or_none()
        if ss:
            await self.db.delete(ss)
            await self.db.commit()

    async def update_profile(self, user: User, data: UserProfileUpdate) -> User:
        if data.full_name is not None:
            user.full_name = data.full_name
        if data.email is not None:
            user.email = data.email
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_preferences(self, user: User, prefs: dict) -> User:
        current = user.preferences or {}
        merged = {**current, **prefs}
        user.preferences = merged
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def change_password(self, user: User, data: UserPasswordUpdate) -> bool:
        from app.core.security import verify_password, get_password_hash as hash_password
        if not verify_password(data.current_password, user.password_hash):
            return False
        user.password_hash = hash_password(data.new_password)
        await self.db.commit()
        return True
