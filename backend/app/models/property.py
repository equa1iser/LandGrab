import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Numeric, Integer, DateTime, Date, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base
import enum


class PropertyType(str, enum.Enum):
    single_family = "single_family"
    condo = "condo"
    multi_family = "multi_family"
    townhouse = "townhouse"
    land = "land"
    commercial = "commercial"
    other = "other"


class PriceEventType(str, enum.Enum):
    list = "list"
    sale = "sale"
    delist = "delist"
    price_change = "price_change"


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    external_id: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False)

    # Address
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[Optional[str]] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(2), nullable=False)
    zip_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    county: Mapped[Optional[str]] = mapped_column(String(100))

    # Location
    lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7))
    lng: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7))

    # Property details
    beds: Mapped[Optional[int]] = mapped_column(Integer)
    baths: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    sqft: Mapped[Optional[int]] = mapped_column(Integer)
    lot_size_acres: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4))
    year_built: Mapped[Optional[int]] = mapped_column(Integer)
    property_type: Mapped[Optional[PropertyType]] = mapped_column(SAEnum(PropertyType))

    # Pricing
    current_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    list_date: Mapped[Optional[date]] = mapped_column(Date)
    days_on_market: Mapped[Optional[int]] = mapped_column(Integer)

    # Description
    description: Mapped[Optional[str]] = mapped_column(Text)
    photo_urls: Mapped[Optional[list]] = mapped_column(JSONB)

    # Raw data and metadata
    raw_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    price_history: Mapped[list["PriceHistory"]] = relationship(
        "PriceHistory", back_populates="property", cascade="all, delete-orphan",
        order_by="PriceHistory.event_date.desc()"
    )
    tax_history: Mapped[list["TaxHistory"]] = relationship(
        "TaxHistory", back_populates="property", cascade="all, delete-orphan",
        order_by="TaxHistory.year.desc()"
    )
    deal_scores: Mapped[list["DealScore"]] = relationship(
        "DealScore", back_populates="property", cascade="all, delete-orphan"
    )


class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[PriceEventType] = mapped_column(SAEnum(PriceEventType))
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(500))

    property: Mapped["Property"] = relationship("Property", back_populates="price_history")


class TaxHistory(Base):
    __tablename__ = "tax_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), index=True
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    assessed_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    tax_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    source: Mapped[str] = mapped_column(String(50), nullable=False)

    property: Mapped["Property"] = relationship("Property", back_populates="tax_history")
