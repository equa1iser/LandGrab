from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.schemas.auth import TokenResponse, RegisterRequest, RefreshRequest
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.login(form.username, form.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return result


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.refresh(data.refresh_token)
    if not result:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return result


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(data: RefreshRequest):
    from app.core.redis_client import cache_set
    # Blacklist the refresh token for its remaining TTL
    await cache_set(f"blacklist:{data.refresh_token}", "1", ttl=30 * 24 * 3600)


class GoogleLoginRequest(BaseModel):
    credential: str  # Google ID token returned by GIS


@router.post("/google", response_model=TokenResponse)
async def google_login(data: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google login not configured")

    # Verify the Google ID token by calling Google's tokeninfo endpoint
    import httpx
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": data.credential},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    payload = resp.json()

    # Ensure the token was issued for our app (prevents token injection attacks)
    if payload.get("aud") != settings.GOOGLE_OAUTH_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token audience mismatch")

    google_id = payload.get("sub")
    email = payload.get("email")
    full_name = payload.get("name") or email.split("@")[0]

    if not google_id or not email:
        raise HTTPException(status_code=401, detail="Incomplete Google profile")

    return await AuthService(db).google_login(google_id, email, full_name)
