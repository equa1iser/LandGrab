from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class PriceEvent(BaseModel):
    id: UUID4
    event_type: str
    price: Decimal
    event_date: date
    source: str
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class TaxRecord(BaseModel):
    id: UUID4
    year: int
    assessed_value: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    source: str

    model_config = {"from_attributes": True}


class ComparableSale(BaseModel):
    address: str
    city: str
    state: str
    price: Decimal
    sqft: Optional[int] = None
    beds: Optional[int] = None
    baths: Optional[Decimal] = None
    sale_date: date
    distance_miles: Optional[float] = None
    price_per_sqft: Optional[Decimal] = None
    similarity_score: Optional[float] = None


class NeighborhoodSummary(BaseModel):
    crime_index: Optional[float] = None
    crime_grade: Optional[str] = None
    median_household_income: Optional[float] = None
    population: Optional[int] = None
    population_growth_pct: Optional[float] = None
    owner_occupied_pct: Optional[float] = None
    walk_score: Optional[int] = None
    transit_score: Optional[int] = None
    school_rating_avg: Optional[float] = None

    model_config = {"from_attributes": True}


class MarketSummary(BaseModel):
    median_price: Optional[float] = None
    price_per_sqft: Optional[float] = None
    median_days_on_market: Optional[float] = None
    months_of_supply: Optional[float] = None
    sales_volume_30d: Optional[int] = None
    sales_volume_90d: Optional[int] = None
    yoy_price_change_pct: Optional[float] = None
    interest_rate_30yr: Optional[float] = None
    interest_rate_15yr: Optional[float] = None

    model_config = {"from_attributes": True}


class DealScoreSummary(BaseModel):
    score: int
    grade: str
    verdict: Optional[str] = None
    ai_analysis: Optional[str] = None
    score_components: Optional[dict] = None
    key_factors: Optional[list] = None

    model_config = {"from_attributes": True}


class PropertyBase(BaseModel):
    id: UUID4
    address_line1: str
    city: str
    state: str
    zip_code: str
    county: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    beds: Optional[int] = None
    baths: Optional[float] = None
    sqft: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    property_type: Optional[str] = None
    current_price: Optional[float] = None
    list_date: Optional[date] = None
    days_on_market: Optional[int] = None
    photo_urls: Optional[list] = None

    model_config = {"from_attributes": True}


class PropertySummaryResponse(PropertyBase):
    deal_score: Optional[int] = None


class PropertyDetailResponse(BaseModel):
    property: PropertyBase
    price_history: list[PriceEvent] = []
    tax_history: list[TaxRecord] = []
    comps: list[ComparableSale] = []
    neighborhood: Optional[NeighborhoodSummary] = None
    market: Optional[MarketSummary] = None
    deal_score: Optional[DealScoreSummary] = None

    model_config = {"from_attributes": True}
