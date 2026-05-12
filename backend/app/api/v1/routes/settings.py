from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Annotated

from app.api.v1.deps import get_current_user, get_admin_user
from app.models.user import User
from app.core.redis_client import cache_get, get_redis
from app.core.config import settings
import json

router = APIRouter()

SETTINGS_KEY = "app:settings"

CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(get_admin_user)]


class AppSettings(BaseModel):
    map_bbox_miles: int = Field(default=40, ge=5, le=500)


async def _load() -> AppSettings:
    stored = await cache_get(SETTINGS_KEY)
    if stored and isinstance(stored, dict):
        return AppSettings(**{k: v for k, v in stored.items() if k in AppSettings.model_fields})
    return AppSettings(map_bbox_miles=settings.MAP_BBOX_MILES)


@router.get("", response_model=AppSettings)
async def get_settings(_: CurrentUser):
    return await _load()


@router.put("", response_model=AppSettings)
async def update_settings(body: AppSettings, _: AdminUser):
    redis = await get_redis()
    await redis.set(SETTINGS_KEY, json.dumps(body.model_dump()))  # no TTL — persists until changed
    return body
