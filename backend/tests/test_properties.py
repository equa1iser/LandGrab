import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, patch

PROP_ID = str(uuid.uuid4())

SUMMARY = {
    "id": PROP_ID,
    "address_line1": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip_code": "78701",
    "current_price": 450000,
    "beds": 3,
    "baths": 2,
    "deal_score": 72,
}

DETAIL = {
    "property": SUMMARY,
    "price_history": [],
    "tax_history": [],
    "comps": [],
    "neighborhood": None,
    "market": None,
    "deal_score": None,
}


# ── Search ────────────────────────────────────────────────────────────────────

async def test_search_properties_no_params(client):
    with patch("app.api.v1.routes.properties.PropertyService") as MockSvc:
        MockSvc.return_value.search = AsyncMock(return_value=[SUMMARY])
        r = await client.get("/api/v1/properties")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_search_properties_by_city(client):
    with patch("app.api.v1.routes.properties.PropertyService") as MockSvc:
        MockSvc.return_value.search = AsyncMock(return_value=[SUMMARY])
        r = await client.get("/api/v1/properties", params={"city": "Austin", "state": "TX"})
    assert r.status_code == 200
    assert r.json()[0]["city"] == "Austin"


async def test_search_properties_by_zip(client):
    with patch("app.api.v1.routes.properties.PropertyService") as MockSvc:
        MockSvc.return_value.search = AsyncMock(return_value=[SUMMARY])
        r = await client.get("/api/v1/properties", params={"zip_code": "78701"})
    assert r.status_code == 200


async def test_search_properties_with_price_filter(client):
    with patch("app.api.v1.routes.properties.PropertyService") as MockSvc:
        MockSvc.return_value.search = AsyncMock(return_value=[])
        r = await client.get("/api/v1/properties", params={"min_price": 100000, "max_price": 500000})
    assert r.status_code == 200


async def test_search_limit_cap(client):
    """limit > 100 should fail validation."""
    r = await client.get("/api/v1/properties", params={"limit": 200})
    assert r.status_code == 422


# ── Detail ────────────────────────────────────────────────────────────────────

async def test_get_property_found(client):
    with patch("app.api.v1.routes.properties.PropertyService") as MockSvc:
        MockSvc.return_value.get_detail = AsyncMock(return_value=DETAIL)
        r = await client.get(f"/api/v1/properties/{PROP_ID}")
    assert r.status_code == 200
    assert r.json()["property"]["id"] == PROP_ID


async def test_get_property_not_found(client):
    with patch("app.api.v1.routes.properties.PropertyService") as MockSvc:
        MockSvc.return_value.get_detail = AsyncMock(return_value=None)
        r = await client.get(f"/api/v1/properties/{PROP_ID}")
    assert r.status_code == 404


# ── Sub-routes ────────────────────────────────────────────────────────────────

async def test_get_deal_score_found(client):
    score_data = {"score": 72, "grade": "B", "verdict": "BUY"}
    with patch("app.services.ai.deal_score_service.DealScoreService") as MockSvc:
        MockSvc.return_value.get_or_compute = AsyncMock(return_value=score_data)
        r = await client.get(f"/api/v1/properties/{PROP_ID}/score")
    assert r.status_code == 200
    assert r.json()["score"] == 72


async def test_get_deal_score_not_found(client):
    with patch("app.services.ai.deal_score_service.DealScoreService") as MockSvc:
        MockSvc.return_value.get_or_compute = AsyncMock(return_value=None)
        r = await client.get(f"/api/v1/properties/{PROP_ID}/score")
    assert r.status_code == 404


async def test_get_comps(client):
    with patch("app.services.comps_service.CompsService") as MockSvc:
        MockSvc.return_value.get_comps = AsyncMock(return_value=[])
        r = await client.get(f"/api/v1/properties/{PROP_ID}/comps")
    assert r.status_code == 200


async def test_get_price_history(client):
    with patch("app.api.v1.routes.properties.PropertyService") as MockSvc:
        MockSvc.return_value.get_price_history = AsyncMock(return_value=[])
        r = await client.get(f"/api/v1/properties/{PROP_ID}/price-history")
    assert r.status_code == 200


async def test_get_avm(client):
    avm_data = {"estimated_value": 475000, "confidence": 0.82, "range_low": 450000, "range_high": 500000}
    with patch("app.services.ai.valuation_model.LandGrabAVM") as MockAVM:
        MockAVM.return_value.estimate = AsyncMock(return_value=avm_data)
        r = await client.get(f"/api/v1/properties/{PROP_ID}/avm")
    assert r.status_code == 200
    assert r.json()["estimated_value"] == 475000
