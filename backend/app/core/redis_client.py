import json
from datetime import timedelta
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

# Cache TTL constants (seconds)
PROPERTY_TTL     = 48 * 3600  # 48 hours — individual property records
SEARCH_TTL       = 24 * 3600  # 24 hours — search result sets (keyed by query params)
NEIGHBORHOOD_TTL = 86400       # 24 hours
MARKET_TTL       = 24 * 3600  # 24 hours — market/zip stats
AI_SCORE_TTL     = 43200       # 12 hours
RATES_TTL        = 3600        # 1 hour   — interest rates change frequently
AUTOCOMPLETE_TTL = 300         # 5 minutes

# DB-level freshness thresholds — how old a DB record can be before we re-fetch
DB_SEARCH_FRESHNESS  = timedelta(hours=24)  # used in property_service.search()
DB_ADDRESS_FRESHNESS = timedelta(hours=24)  # used in get_or_fetch_by_address()

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def cache_get(key: str) -> Optional[Any]:
    redis = await get_redis()
    value = await redis.get(key)
    if value is None:
        return None
    return json.loads(value)


async def cache_set(key: str, value: Any, ttl: int = PROPERTY_TTL) -> None:
    redis = await get_redis()
    await redis.set(key, json.dumps(value), ex=ttl)


async def cache_delete(key: str) -> None:
    redis = await get_redis()
    await redis.delete(key)


async def cache_incr(key: str) -> int:
    redis = await get_redis()
    return await redis.incr(key)


async def cache_expire(key: str, ttl: int) -> None:
    redis = await get_redis()
    await redis.expire(key, ttl)


async def close_redis() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
