from unittest.mock import AsyncMock, patch
from app.schemas.auth import TokenResponse

TOKENS = TokenResponse(
    access_token="access_abc",
    refresh_token="refresh_xyz",
)


# ── Register ──────────────────────────────────────────────────────────────────

async def test_register_success(client):
    with patch("app.api.v1.routes.auth.AuthService") as MockSvc:
        MockSvc.return_value.register = AsyncMock(return_value=TOKENS)
        r = await client.post(
            "/api/v1/auth/register",
            json={"email": "new@example.com", "password": "secret123", "full_name": "New User"},
        )
    assert r.status_code == 201
    body = r.json()
    assert body["access_token"] == "access_abc"
    assert body["token_type"] == "bearer"


async def test_register_duplicate_email(client):
    from fastapi import HTTPException, status

    with patch("app.api.v1.routes.auth.AuthService") as MockSvc:
        MockSvc.return_value.register = AsyncMock(
            side_effect=HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        )
        r = await client.post(
            "/api/v1/auth/register",
            json={"email": "dup@example.com", "password": "secret123", "full_name": "Dup User"},
        )
    assert r.status_code == 409
    assert r.json()["detail"] == "Email already registered"


async def test_register_invalid_email(client):
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "secret123", "full_name": "Bad"},
    )
    assert r.status_code == 422


async def test_register_missing_fields(client):
    r = await client.post("/api/v1/auth/register", json={"email": "x@x.com"})
    assert r.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────

async def test_login_success(client):
    with patch("app.api.v1.routes.auth.AuthService") as MockSvc:
        MockSvc.return_value.login = AsyncMock(return_value=TOKENS)
        r = await client.post(
            "/api/v1/auth/login",
            data={"username": "user@example.com", "password": "secret123"},
        )
    assert r.status_code == 200
    assert r.json()["access_token"] == "access_abc"


async def test_login_bad_credentials(client):
    with patch("app.api.v1.routes.auth.AuthService") as MockSvc:
        MockSvc.return_value.login = AsyncMock(return_value=None)
        r = await client.post(
            "/api/v1/auth/login",
            data={"username": "user@example.com", "password": "wrong"},
        )
    assert r.status_code == 401


# ── Refresh ───────────────────────────────────────────────────────────────────

async def test_refresh_success(client):
    with patch("app.api.v1.routes.auth.AuthService") as MockSvc:
        MockSvc.return_value.refresh = AsyncMock(return_value=TOKENS)
        r = await client.post("/api/v1/auth/refresh", json={"refresh_token": "refresh_xyz"})
    assert r.status_code == 200
    assert "access_token" in r.json()


async def test_refresh_invalid_token(client):
    with patch("app.api.v1.routes.auth.AuthService") as MockSvc:
        MockSvc.return_value.refresh = AsyncMock(return_value=None)
        r = await client.post("/api/v1/auth/refresh", json={"refresh_token": "bad_token"})
    assert r.status_code == 401


# ── Logout ────────────────────────────────────────────────────────────────────

async def test_logout(client):
    with patch("app.core.redis_client.cache_set", new_callable=AsyncMock):
        r = await client.post("/api/v1/auth/logout", json={"refresh_token": "refresh_xyz"})
    assert r.status_code == 204
