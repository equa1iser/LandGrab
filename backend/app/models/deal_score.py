import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base


class DealScore(Base):
    __tablename__ = "deal_scores"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), index=True
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    grade: Mapped[str] = mapped_column(String(2), nullable=False)
    verdict: Mapped[Optional[str]] = mapped_column(String(50))
    ai_analysis: Mapped[Optional[str]] = mapped_column(Text)
    score_components: Mapped[Optional[dict]] = mapped_column(JSONB)
    key_factors: Mapped[Optional[list]] = mapped_column(JSONB)
    risks: Mapped[Optional[list]] = mapped_column(JSONB)
    opportunities: Mapped[Optional[list]] = mapped_column(JSONB)
    model_version: Mapped[str] = mapped_column(String(50), default="1.0")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    property: Mapped["Property"] = relationship("Property", back_populates="deal_scores")
