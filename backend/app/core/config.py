from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://landgrab:changeme@localhost:5432/landgrab"
    POSTGRES_USER: str = "landgrab"
    POSTGRES_PASSWORD: str = "changeme"
    POSTGRES_DB: str = "landgrab"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Free API keys
    FRED_API_KEY: Optional[str] = None
    CENSUS_API_KEY: Optional[str] = None
    FBI_CRIME_API_KEY: Optional[str] = None
    RENTCAST_API_KEY: Optional[str] = None
    API_NINJAS_KEY: Optional[str] = None

    # Paid API keys (optional — adapters skip gracefully if missing)
    ATTOM_API_KEY: Optional[str] = None
    GREATSCHOOLS_API_KEY: Optional[str] = None
    WALK_SCORE_API_KEY: Optional[str] = None

    # AI
    ANTHROPIC_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

    # Google OAuth
    GOOGLE_OAUTH_CLIENT_ID: Optional[str] = None

    # Maps
    NEXT_PUBLIC_MAPBOX_TOKEN: Optional[str] = None

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: str = "alerts@landgrab.io"

    # Frontend
    NEXT_PUBLIC_API_BASE_URL: str = "http://localhost:8000"

    # Monetization
    FREE_TIER_VIEW_LIMIT: int = 5

    # App
    APP_NAME: str = "LandGrab"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
