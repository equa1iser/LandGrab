from pydantic import BaseModel, UUID4, EmailStr
from typing import Optional
from datetime import datetime


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


class SavedSearchUpdate(BaseModel):
    name: Optional[str] = None
    search_params: Optional[dict] = None
    alert_enabled: Optional[bool] = None
    alert_frequency: Optional[str] = None
