from pydantic import BaseModel, UUID4, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserPreferences(BaseModel):
    notify_price_drops: bool = True
    notify_new_listings: bool = True
    alert_frequency: str = "daily"  # "immediate" | "daily" | "weekly"
    marketing_emails: bool = False


class UserResponse(BaseModel):
    id: UUID4
    email: str
    full_name: str
    tier: str
    is_active: bool
    is_admin: bool = False
    preferences: UserPreferences = UserPreferences()
    created_at: datetime

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class SavedPropertyCreate(BaseModel):
    property_id: str
    notes: Optional[str] = None
    alert_enabled: bool = True


class SavedSearchCreate(BaseModel):
    name: str
    search_params: dict
    alert_enabled: bool = False
    alert_frequency: str = "daily"


class UsageResponse(BaseModel):
    views_used: int
    views_limit: int       # 5 for free, -1 for unlimited (pro)
    views_remaining: int   # -1 means unlimited
    resets_at: str         # ISO datetime of first day of next month
    is_unlimited: bool


class SavedSearchUpdate(BaseModel):
    name: Optional[str] = None
    search_params: Optional[dict] = None
    alert_enabled: Optional[bool] = None
    alert_frequency: Optional[str] = None


# --- Admin schemas ---

class AdminUserItem(BaseModel):
    id: UUID4
    email: str
    full_name: str
    tier: str
    is_active: bool
    is_admin: bool
    is_verified: bool
    created_at: datetime
    saved_properties_count: int = 0
    saved_searches_count: int = 0

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    tier: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class AdminUserStats(BaseModel):
    total: int
    active: int
    verified: int
    pro: int
    admins: int
    new_7d: int
    new_30d: int


class AdminPropertyStats(BaseModel):
    total_cached: int
    sources: dict


class AdminApiUsage(BaseModel):
    rentcast_calls_this_month: int
    rentcast_monthly_quota: int
    api_keys_configured: dict


class AdminOverview(BaseModel):
    users: AdminUserStats
    properties: AdminPropertyStats
    api_usage: AdminApiUsage
