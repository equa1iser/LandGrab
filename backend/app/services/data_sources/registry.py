from typing import Any, Optional

from app.services.data_sources.base import BaseDataSource, QuotaExceededException


class DataSourceRegistry:
    def __init__(self):
        self._sources: dict[str, BaseDataSource] = {}
        self._priority_order: list[str] = []

    def register(self, source: BaseDataSource):
        self._sources[source.source_name] = source
        self._priority_order = sorted(
            self._sources.keys(),
            key=lambda name: self._sources[name].priority,
        )

    def get(self, name: str) -> Optional[BaseDataSource]:
        return self._sources.get(name)

    async def get_property_details(
        self, address: str, city: str, state: str, zip_code: str
    ) -> Optional[dict[str, Any]]:
        for name in self._priority_order:
            source = self._sources[name]
            if not await source.is_available():
                continue
            try:
                result = await source.get_property_details(address, city, state, zip_code)
                if result:
                    return result
            except QuotaExceededException:
                continue
            except Exception:
                continue
        return None

    async def search_properties(self, **kwargs) -> list[dict[str, Any]]:
        for name in self._priority_order:
            source = self._sources[name]
            if not await source.is_available():
                continue
            try:
                results = await source.search_properties(**kwargs)
                if results:
                    return results
            except QuotaExceededException:
                continue
            except Exception:
                continue
        return []

    async def get_price_history(self, property_external_id: str, source_name: str = None) -> list[dict]:
        if source_name and source_name in self._sources:
            try:
                return await self._sources[source_name].get_price_history(property_external_id)
            except Exception:
                return []

        for name in self._priority_order:
            try:
                result = await self._sources[name].get_price_history(property_external_id)
                if result:
                    return result
            except Exception:
                continue
        return []

    async def get_tax_history(self, property_external_id: str, source_name: str = None) -> list[dict]:
        if source_name and source_name in self._sources:
            try:
                return await self._sources[source_name].get_tax_history(property_external_id)
            except Exception:
                return []

        for name in self._priority_order:
            try:
                result = await self._sources[name].get_tax_history(property_external_id)
                if result:
                    return result
            except Exception:
                continue
        return []


# Singleton
_registry: Optional[DataSourceRegistry] = None


def get_registry() -> DataSourceRegistry:
    global _registry
    if _registry is None:
        _registry = DataSourceRegistry()
    return _registry


async def initialize_registry():
    """Called at app startup to register all available data sources."""
    from app.services.data_sources.attom_adapter import ATTOMAdapter
    from app.services.data_sources.rentcast_adapter import RentCastAdapter
    from app.services.data_sources.fred_adapter import FREDAdapter
    from app.services.data_sources.census_adapter import CensusAdapter
    from app.services.data_sources.fbi_crime_adapter import FBICrimeAdapter

    registry = get_registry()
    registry.register(ATTOMAdapter())
    registry.register(RentCastAdapter())
    registry.register(FREDAdapter())
    registry.register(CensusAdapter())
    registry.register(FBICrimeAdapter())
