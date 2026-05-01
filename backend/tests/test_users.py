import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime


SAVED_PROP_ID = str(uuid.uuid4())
SAVED_SEARCH_ID = str(uuid.uuid4())


def _saved_prop():
    return {
        "id": SAVED_PROP_ID,
        "property_id": str(uuid.uuid4()),
        "notes": "Nice house",
        "alert_enabled": True,
    }


def _saved_search():
    return {
        "id": SAVED_SEARCH_ID,
        "name": "Austin under 500k",
        "search_params": {"city": "Austin", "max_price": 500000},
        "alert_enabled": False,
    }


# ── /users/me ─────────────────────────────────────────────────────────────────

async def test_get_me(auth_client, mock_user):
    mock_user.id = uuid.uuid4()
    mock_user.created_at = datetime(2024, 1, 1)
    r = await auth_client.get("/api/v1/users/me")
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "test@example.com"
    assert body["full_name"] == "Test User"


async def test_get_me_unauthenticated(client):
    r = await client.get("/api/v1/users/me")
    assert r.status_code == 401


# ── Saved Properties ──────────────────────────────────────────────────────────

async def test_list_saved_properties(auth_client):
    with patch("app.services.user_service.UserService") as MockSvc:
        MockSvc.return_value.list_saved_properties = AsyncMock(return_value=[_saved_prop()])
        r = await auth_client.get("/api/v1/users/saved-properties")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_save_property(auth_client):
    with patch("app.services.user_service.UserService") as MockSvc:
        MockSvc.return_value.save_property = AsyncMock(return_value=_saved_prop())
        r = await auth_client.post(
            "/api/v1/users/saved-properties",
            json={"property_id": str(uuid.uuid4()), "notes": "Great deal"},
        )
    assert r.status_code == 201


async def test_remove_saved_property(auth_client):
    with patch("app.services.user_service.UserService") as MockSvc:
        MockSvc.return_value.remove_saved_property = AsyncMock(return_value=None)
        r = await auth_client.delete(f"/api/v1/users/saved-properties/{SAVED_PROP_ID}")
    assert r.status_code == 204


# ── Saved Searches ────────────────────────────────────────────────────────────

async def test_list_saved_searches(auth_client):
    with patch("app.services.user_service.UserService") as MockSvc:
        MockSvc.return_value.list_saved_searches = AsyncMock(return_value=[_saved_search()])
        r = await auth_client.get("/api/v1/users/saved-searches")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_create_saved_search(auth_client):
    with patch("app.services.user_service.UserService") as MockSvc:
        MockSvc.return_value.create_saved_search = AsyncMock(return_value=_saved_search())
        r = await auth_client.post(
            "/api/v1/users/saved-searches",
            json={"name": "Austin 3br", "search_params": {"city": "Austin", "beds": 3}},
        )
    assert r.status_code == 201


async def test_update_saved_search(auth_client):
    updated = {**_saved_search(), "name": "Updated name"}
    with patch("app.services.user_service.UserService") as MockSvc:
        MockSvc.return_value.update_saved_search = AsyncMock(return_value=updated)
        r = await auth_client.put(
            f"/api/v1/users/saved-searches/{SAVED_SEARCH_ID}",
            json={"name": "Updated name"},
        )
    assert r.status_code == 200
    assert r.json()["name"] == "Updated name"


async def test_update_saved_search_not_found(auth_client):
    with patch("app.services.user_service.UserService") as MockSvc:
        MockSvc.return_value.update_saved_search = AsyncMock(return_value=None)
        r = await auth_client.put(
            f"/api/v1/users/saved-searches/{SAVED_SEARCH_ID}",
            json={"name": "Nope"},
        )
    assert r.status_code == 404


async def test_delete_saved_search(auth_client):
    with patch("app.services.user_service.UserService") as MockSvc:
        MockSvc.return_value.delete_saved_search = AsyncMock(return_value=None)
        r = await auth_client.delete(f"/api/v1/users/saved-searches/{SAVED_SEARCH_ID}")
    assert r.status_code == 204
