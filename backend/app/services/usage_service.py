from datetime import datetime, date
from calendar import monthrange
from typing import Any

from app.core.redis_client import cache_get, cache_set, cache_incr, cache_expire
from app.core.config import settings

_VIEW_LIMIT = settings.FREE_TIER_VIEW_LIMIT
_TTL = 33 * 24 * 3600  # 33 days — safely covers a full month + buffer


def _month_key(user_id: str) -> str:
    ym = datetime.utcnow().strftime("%Y-%m")
    return f"user:view_count:{user_id}:{ym}"


def _dedup_key(user_id: str, property_id: str) -> str:
    ym = datetime.utcnow().strftime("%Y-%m")
    return f"user:viewed:{user_id}:{property_id}:{ym}"


def _resets_at() -> str:
    now = datetime.utcnow()
    if now.month == 12:
        reset = date(now.year + 1, 1, 1)
    else:
        reset = date(now.year, now.month + 1, 1)
    return f"{reset.isoformat()}T00:00:00Z"


def _build_usage(views_used: int, is_unlimited: bool) -> dict[str, Any]:
    if is_unlimited:
        return {
            "views_used": 0,
            "views_limit": -1,
            "views_remaining": -1,
            "resets_at": _resets_at(),
            "is_unlimited": True,
        }
    remaining = max(0, _VIEW_LIMIT - views_used)
    return {
        "views_used": views_used,
        "views_limit": _VIEW_LIMIT,
        "views_remaining": remaining,
        "resets_at": _resets_at(),
        "is_unlimited": False,
    }


async def get_usage(user_id: str, is_pro: bool) -> dict[str, Any]:
    if is_pro:
        return _build_usage(0, is_unlimited=True)
    count = await cache_get(_month_key(user_id)) or 0
    return _build_usage(int(count), is_unlimited=False)


async def track_view(user_id: str, property_id: str, is_pro: bool) -> dict[str, Any]:
    """Increment per-user monthly property view counter.

    Deduplicates: the same property viewed multiple times in a month counts once.
    Returns the updated usage dict.
    """
    if is_pro:
        return _build_usage(0, is_unlimited=True)

    dedup = _dedup_key(user_id, property_id)
    already_viewed = await cache_get(dedup)
    if already_viewed:
        # Repeat visit — fetch current count without incrementing
        count = await cache_get(_month_key(user_id)) or 0
        return _build_usage(int(count), is_unlimited=False)

    # Mark this property as viewed for this user this month
    await cache_set(dedup, True, ttl=_TTL)

    # Increment the monthly counter, setting TTL on first call
    count = await cache_incr(_month_key(user_id))
    if count == 1:
        await cache_expire(_month_key(user_id), _TTL)

    return _build_usage(int(count), is_unlimited=False)
