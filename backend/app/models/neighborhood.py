import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Numeric, Integer, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base
import enum


class GeoType(str, enum.Enum):
    zip = "zip"
    tract = "tract"
    city = "city"
    county = "county"


class NeighborhoodData(Base):
    __tablename__ = "neighborhood_data"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    geo_key: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    geo_type: Mapped[GeoType] = mapped_column(SAEnum(GeoType), nullable=False)

    # Crime
    crime_index: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    crime_grade: Mapped[Optional[str]] = mapped_column(String(2))

    # Demographics
    median_household_income: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    population: Mapped[Optional[int]] = mapped_column(Integer)
    population_growth_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    owner_occupied_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    median_home_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))

    # Scores
    walk_score: Mapped[Optional[int]] = mapped_column(Integer)
    transit_score: Mapped[Optional[int]] = mapped_column(Integer)
    bike_score: Mapped[Optional[int]] = mapped_column(Integer)
    school_rating_avg: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 2))

    # Raw data from each source
    demographics: Mapped[Optional[dict]] = mapped_column(JSONB)
    raw_sources: Mapped[Optional[dict]] = mapped_column(JSONB)

    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
