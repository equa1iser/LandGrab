import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Numeric, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base


class MarketData(Base):
    __tablename__ = "market_data"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    geo_key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)

    # Pricing
    median_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    price_per_sqft: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    price_per_acre: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))

    # Market velocity
    median_days_on_market: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 1))
    months_of_supply: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    sales_volume_30d: Mapped[Optional[int]] = mapped_column(Integer)
    sales_volume_90d: Mapped[Optional[int]] = mapped_column(Integer)

    # Trends
    yoy_price_change_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    mom_price_change_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    hpi_index: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4))

    # Interest rates (from FRED)
    interest_rate_30yr: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 3))
    interest_rate_15yr: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 3))
    interest_rate_5yr_arm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 3))

    raw_sources: Mapped[Optional[dict]] = mapped_column(JSONB)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
