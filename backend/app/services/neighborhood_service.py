from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.neighborhood import NeighborhoodData, GeoType
from app.services.data_sources.census_adapter import CensusAdapter
from app.services.data_sources.fbi_crime_adapter import FBICrimeAdapter


class NeighborhoodService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_fetch(self, zip_code: str, city: str = "", state: str = "") -> Optional[dict]:
        result = await self.db.execute(
            select(NeighborhoodData).where(
                NeighborhoodData.geo_key == zip_code,
                NeighborhoodData.geo_type == GeoType.zip,
            )
        )
        record = result.scalar_one_or_none()

        if record and record.expires_at and record.expires_at > datetime.utcnow():
            return self._to_dict(record)

        # Fetch from APIs in parallel
        import asyncio
        census_task = CensusAdapter().get_demographics(zip_code)
        crime_task = FBICrimeAdapter().get_crime_data(city or "", state or "")
        census_data, crime_data = await asyncio.gather(census_task, crime_task, return_exceptions=True)

        if isinstance(census_data, Exception):
            census_data = None
        if isinstance(crime_data, Exception):
            crime_data = None

        if not census_data and not crime_data:
            return self._to_dict(record) if record else None

        if not record:
            record = NeighborhoodData(geo_key=zip_code, geo_type=GeoType.zip)
            self.db.add(record)

        if census_data:
            record.median_household_income = census_data.get("median_household_income")
            record.population = census_data.get("total_population")
            record.owner_occupied_pct = census_data.get("owner_occupied_pct")
            record.median_home_value = census_data.get("median_home_value")

        if crime_data:
            record.crime_index = crime_data.get("crime_index")
            record.crime_grade = crime_data.get("crime_grade")

        raw_sources = {}
        if census_data:
            raw_sources["census"] = census_data
        if crime_data:
            raw_sources["fbi_crime"] = crime_data
        record.raw_sources = raw_sources

        record.fetched_at = datetime.utcnow()
        record.expires_at = datetime.utcnow() + timedelta(hours=24)
        await self.db.flush()

        return self._to_dict(record)

    def _to_dict(self, record: Optional[NeighborhoodData]) -> Optional[dict]:
        if not record:
            return None
        return {
            "crime_index": record.crime_index,
            "crime_grade": record.crime_grade,
            "median_household_income": record.median_household_income,
            "population": record.population,
            "population_growth_pct": record.population_growth_pct,
            "owner_occupied_pct": record.owner_occupied_pct,
            "walk_score": record.walk_score,
            "transit_score": record.transit_score,
            "school_rating_avg": record.school_rating_avg,
        }
