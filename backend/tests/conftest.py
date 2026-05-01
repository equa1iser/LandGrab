import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from datetime import datetime


# Patch lifespan side-effects before the app starts so tests don't need
# a live PostgreSQL, Redis, or external data-source registry.
@pytest.fixture(scope="session", autouse=True)
def patch_startup():
    with (
        patch("app.main.close_redis", new_callable=AsyncMock),
        patch(
            "app.services.data_sources.registry.initialize_registry",
            new_callable=AsyncMock,
        ),
    ):
        yield


# ── Shared user fixture ────────────────────────────────────────────────────────

@pytest.fixture
def test_user_id():
    return str(uuid.uuid4())


@pytest.fixture
def mock_user(test_user_id):
    user = MagicMock()
    user.id = uuid.UUID(test_user_id)
    user.email = "test@example.com"
    user.full_name = "Test User"
    user.tier = "free"
    user.is_active = True
    user.created_at = datetime(2024, 1, 1)
    return user


# ── HTTP clients ───────────────────────────────────────────────────────────────

@pytest.fixture
async def client():
    """Unauthenticated client with mocked DB."""
    from app.main import app
    from app.core.database import get_db

    async def mock_db():
        yield AsyncMock()

    app.dependency_overrides[get_db] = mock_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_client(mock_user):
    """Authenticated client — get_current_user returns mock_user."""
    from app.main import app
    from app.core.database import get_db
    from app.api.v1.deps import get_current_user

    async def mock_db():
        yield AsyncMock()

    async def override_current_user():
        return mock_user

    app.dependency_overrides[get_db] = mock_db
    app.dependency_overrides[get_current_user] = override_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
