from unittest.mock import AsyncMock, patch


async def test_autocomplete_returns_suggestions(client):
    suggestions = [
        {"label": "Austin, TX", "type": "city"},
        {"label": "Austin, TX 78701", "type": "zip"},
    ]
    with patch("app.services.geocoding_service.GeocodingService") as MockSvc:
        MockSvc.return_value.autocomplete = AsyncMock(return_value=suggestions)
        r = await client.get("/api/v1/search/autocomplete", params={"q": "Austin"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_autocomplete_min_length(client):
    """Query under 2 chars must be rejected."""
    r = await client.get("/api/v1/search/autocomplete", params={"q": "A"})
    assert r.status_code == 422


async def test_autocomplete_empty_results(client):
    with patch("app.services.geocoding_service.GeocodingService") as MockSvc:
        MockSvc.return_value.autocomplete = AsyncMock(return_value=[])
        r = await client.get("/api/v1/search/autocomplete", params={"q": "xyzxyz"})
    assert r.status_code == 200
    assert r.json() == []
