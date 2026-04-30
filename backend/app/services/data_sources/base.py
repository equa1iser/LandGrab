from abc import ABC, abstractmethod
from typing import Any, Optional


class QuotaExceededException(Exception):
    pass


class DataSourceUnavailableException(Exception):
    pass


class BaseDataSource(ABC):
    source_name: str = "base"
    priority: int = 100

    @abstractmethod
    async def get_property_details(
        self,
        address: str,
        city: str,
        state: str,
        zip_code: str,
    ) -> Optional[dict[str, Any]]:
        """Return normalized property dict or None if not found."""
        ...

    @abstractmethod
    async def get_price_history(self, property_external_id: str) -> list[dict[str, Any]]:
        """Return list of price events sorted newest first."""
        ...

    @abstractmethod
    async def search_properties(
        self,
        city: Optional[str] = None,
        state: Optional[str] = None,
        zip_code: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        beds: Optional[int] = None,
        baths: Optional[float] = None,
        property_type: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        ...

    async def get_tax_history(self, property_external_id: str) -> list[dict[str, Any]]:
        return []

    async def get_neighborhood_data(self, zip_code: str) -> Optional[dict[str, Any]]:
        return None

    async def is_available(self) -> bool:
        return True
