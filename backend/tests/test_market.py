from unittest.mock import AsyncMock, patch

RATES = {
    "rate_30yr": 6.85,
    "rate_15yr": 6.12,
    "rate_arm_5_1": 5.90,
    "updated_at": "2024-01-15T00:00:00",
}

MARKET = {
    "zip_code": "78701",
    "median_price": 490000,
    "median_days_on_market": 18,
    "months_of_supply": 2.1,
    "yoy_price_change_pct": 3.4,
}


async def test_get_current_rates(client):
    with patch("app.services.data_sources.fred_adapter.FREDAdapter") as MockAdapter:
        MockAdapter.return_value.get_interest_rates = AsyncMock(return_value=RATES)
        r = await client.get("/api/v1/market/rates/current")
    assert r.status_code == 200
    data = r.json()
    assert "rate_30yr" in data


async def test_get_market_data_by_zip(client):
    with patch("app.services.market_service.MarketService") as MockSvc:
        MockSvc.return_value.get_or_fetch = AsyncMock(return_value=MARKET)
        r = await client.get("/api/v1/market/78701")
    assert r.status_code == 200
    assert r.json()["zip_code"] == "78701"


async def test_get_market_data_different_zip(client):
    market_data = {**MARKET, "zip_code": "90210"}
    with patch("app.services.market_service.MarketService") as MockSvc:
        MockSvc.return_value.get_or_fetch = AsyncMock(return_value=market_data)
        r = await client.get("/api/v1/market/90210")
    assert r.status_code == 200
    assert r.json()["zip_code"] == "90210"
