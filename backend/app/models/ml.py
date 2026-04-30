import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Numeric, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base


class ModelMetrics(Base):
    __tablename__ = "model_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    trained_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    training_samples: Mapped[Optional[int]] = mapped_column(Integer)
    mape: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 4))
    rmse: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    r2: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 4))
    feature_importances: Mapped[Optional[dict]] = mapped_column(JSONB)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
