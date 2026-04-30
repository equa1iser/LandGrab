from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.schemas.auth import RegisterRequest, TokenResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: RegisterRequest) -> TokenResponse:
        result = await self.db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = User(
            email=data.email,
            password_hash=get_password_hash(data.password),
            full_name=data.full_name,
        )
        self.db.add(user)
        await self.db.flush()

        return self._create_tokens(user)

    async def login(self, email: str, password: str) -> Optional[TokenResponse]:
        result = await self.db.execute(
            select(User).where(User.email == email, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.password_hash):
            return None
        return self._create_tokens(user)

    async def refresh(self, refresh_token: str) -> Optional[TokenResponse]:
        from app.core.redis_client import cache_get
        if await cache_get(f"blacklist:{refresh_token}"):
            return None

        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return None

        user_id = payload.get("sub")
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        if not user:
            return None

        return self._create_tokens(user)

    def _create_tokens(self, user: User) -> TokenResponse:
        user_id = str(user.id)
        return TokenResponse(
            access_token=create_access_token({"sub": user_id}),
            refresh_token=create_refresh_token({"sub": user_id}),
        )
