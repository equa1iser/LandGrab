import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base
import enum


class AlertFrequency(str, enum.Enum):
    immediate = "immediate"
    daily = "daily"
    weekly = "weekly"


class AlertJobType(str, enum.Enum):
    price_drop = "price_drop"
    new_listing = "new_listing"
    deal_score_change = "deal_score_change"


class AlertJobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class SavedProperty(Base):
    __tablename__ = "saved_properties"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), index=True
    )
    price_snapshot: Mapped[Optional[float]] = mapped_column()
    alert_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="saved_properties")


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    search_params: Mapped[dict] = mapped_column(JSONB, nullable=False)
    alert_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    alert_frequency: Mapped[AlertFrequency] = mapped_column(
        SAEnum(AlertFrequency), default=AlertFrequency.daily
    )
    last_alerted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_results_snapshot: Mapped[Optional[list]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship("User", back_populates="saved_searches")
    alert_jobs: Mapped[list["AlertJob"]] = relationship(
        "AlertJob", back_populates="saved_search", cascade="all, delete-orphan"
    )


class AlertJob(Base):
    __tablename__ = "alert_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    saved_search_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("saved_searches.id", ondelete="CASCADE")
    )
    job_type: Mapped[AlertJobType] = mapped_column(SAEnum(AlertJobType))
    status: Mapped[AlertJobStatus] = mapped_column(
        SAEnum(AlertJobStatus), default=AlertJobStatus.pending
    )
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    next_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    results_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB)
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    saved_search: Mapped[Optional["SavedSearch"]] = relationship(
        "SavedSearch", back_populates="alert_jobs"
    )
