# LandGrab — Claude Instructions

## Git & GitHub Workflow (Required)

After completing any meaningful unit of work — a new feature, a bug fix, a refactor, or a set of related changes — commit and push to GitHub. Do not batch unrelated changes into one commit. Do not leave the session without pushing completed work.

### Commit rules

- Commit after every logical chunk: a completed component, a fixed bug, a new endpoint, a schema change, etc.
- Never commit half-finished work. If a task isn't done, finish it before committing.
- Always push after committing. Local-only commits defeat the purpose.
- Stage specific files by name rather than `git add .` — avoids accidentally committing secrets or generated files.
- Never commit `.env`. It is in `.gitignore` and must stay there.

### Commit message format

```
type: short imperative description (50 chars max)

Optional body explaining WHY if non-obvious. Wrap at 72 chars.
```

**Types:** `feat` · `fix` · `refactor` · `chore` · `docs` · `test`

### When to commit

| Situation | Action |
|---|---|
| New component or page complete | Commit + push |
| Bug fixed and verified | Commit + push |
| New API endpoint working | Commit + push |
| Schema/migration added | Commit + push |
| Multiple related files changed together | One commit + push |
| Session ending | Commit anything complete + push |

### Remote

- Repo: `https://github.com/equa1iser/LandGrab`
- Branch: `main`
- Always push to `origin main`

---

## Project Overview

LandGrab is a real estate buyer intelligence platform.

- **Backend:** FastAPI + PostgreSQL 16 + Celery + Redis (Docker Compose)
- **Frontend:** Next.js 14 App Router + Tailwind black ops theme
- **AI:** Claude `claude-sonnet-4-6` for deal scoring (70/30 blend with rule-based engine)
- **Maps:** Mapbox GL JS with dark tiles, color-coded property markers
- **Data sources:** Pluggable `BaseDataSource` adapters — RentCast, FRED, Census, FBI Crime, API Ninjas; ATTOM slots in via `DataSourceRegistry` when key is present

---

## Infrastructure & Docker

All services run via Docker Compose:

| Service | Port | Notes |
|---|---|---|
| `backend` | 8000 | FastAPI + uvicorn, hot-reload via volume mount |
| `frontend` | 3000 | Next.js dev server, hot-reload via volume mount |
| `db` | 5432 | PostgreSQL 16 |
| `redis` | 6379 | Cache + Celery broker |
| `celery_worker` | — | Background task processor |
| `celery_beat` | — | Scheduled task scheduler |

```bash
docker compose up -d          # start
docker compose down           # stop + remove containers
docker compose restart backend frontend   # restart specific services
```

### Adding or changing .env API keys

`docker compose restart` does NOT re-inject `.env` variables. To pick up new or changed keys you must **force-recreate**:

```bash
docker compose up -d --force-recreate backend celery_worker celery_beat
```

Verify a key loaded correctly:

```bash
docker compose exec backend python -c "from app.core.config import settings; print(settings.RENTCAST_API_KEY[:4])"
```

### Running the API diagnostic

```bash
docker compose exec backend python scripts/test_apis.py
```

Add new API tests to `backend/scripts/test_apis.py` whenever a new data source is integrated.

---

## API Keys & Data Sources

All keys live in `.env` at the project root. The `Settings` class in `backend/app/core/config.py` defines every key with `Optional[str] = None` — adapters skip gracefully when a key is absent.

| Key | Source | Status |
|---|---|---|
| `RENTCAST_API_KEY` | RentCast | Active — primary property listing source |
| `FRED_API_KEY` | Federal Reserve FRED | Active — mortgage rates |
| `CENSUS_API_KEY` | Census Bureau ACS5 | Active — demographic / income data |
| `ATTOM_API_KEY` | ATTOM Data | Configured — trial plan restricts some endpoints |
| `API_NINJAS_KEY` | API Ninjas | Active — city / ZIP supplemental data |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox | Active — map tiles + satellite aerial views (browser-side) |
| `ANTHROPIC_API_KEY` | Anthropic | Not yet configured — deal score falls back to rule-based only |
| `FBI_CRIME_API_KEY` | FBI CDE | Active — state-level violent + property crime rates |

### RentCast search behaviour

`search_properties` uses `/listings/sale` (active listings with asking prices) and falls back to `/properties` (property records, no price). The monthly quota is capped at 50 calls tracked in Redis under `rentcast:monthly_calls`.

Price history is extracted from `raw_data['history']` on each RentCast listing — a dict keyed by `YYYY-MM-DD` date with price + event metadata. This is multi-event for re-listed properties. Do not rely on ATTOM for price history (trial plan returns empty `saleHistory`).

### FBI Crime API

Base URL: `https://api.usa.gov/crime/fbi/cde`

Correct endpoints (confirmed working):
- `/agency/byStateAbbr/{STATE}?API_KEY=...` — agency list, confirms key + connectivity
- `/summarized/state/{STATE}/violent-crime?from=MM-YYYY&to=MM-YYYY&API_KEY=...`
- `/summarized/state/{STATE}/property-crime?from=MM-YYYY&to=MM-YYYY&API_KEY=...`

`API_KEY` is a **query param**, not a header. Date format is `MM-YYYY` (e.g. `01-2022`). The adapter computes `violent_rate_per_100k`, `property_rate_per_100k`, `crime_rate_per_100k`, `crime_index` (0–100), and `crime_grade` (A–F). Data is state-level, not city-level.

---

## File Structure

```
backend/app/
├── main.py
├── api/v1/
│   ├── deps.py                       # get_db, get_current_user
│   └── routes/
│       ├── auth.py                   # register, login, refresh, logout
│       ├── users.py                  # me, PATCH /me, PUT /preferences, PUT /password,
│       │                             # saved-properties, saved-searches
│       ├── properties.py             # search, detail, score, comps, avm, price-history
│       ├── search.py                 # autocomplete
│       └── market.py                 # rates/current, /{zip}
├── core/
│   ├── config.py                     # Settings (all API keys, DB URL, JWT secret)
│   ├── database.py                   # async_sessionmaker, get_db
│   ├── redis_client.py               # cache_get, cache_set, cache_delete
│   └── security.py                   # JWT, bcrypt
├── models/
│   ├── property.py                   # Property, PriceHistory, TaxHistory, PriceEventType
│   ├── deal_score.py                 # DealScore (property_id FK, score, expires_at)
│   ├── user.py                       # User (+ preferences JSONB), SavedProperty, SavedSearch
│   ├── neighborhood.py               # NeighborhoodData
│   ├── market.py                     # MarketData
│   ├── alert.py                      # PriceAlert
│   └── ml.py                         # MLModelMetrics
├── schemas/
│   ├── property.py                   # PropertyBase, PropertySummaryResponse (+ deal_score),
│   │                                 # PropertyDetailResponse, ComparableSale, PriceEvent,
│   │                                 # TaxRecord, DealScoreSummary, NeighborhoodSummary
│   │                                 # (+ crime_rate_per_100k, violent_rate_per_100k,
│   │                                 # property_rate_per_100k), MarketSummary
│   └── user.py                       # UserPreferences, UserProfileUpdate, UserPasswordUpdate,
│                                     # UserResponse (+ preferences, created_at)
├── services/
│   ├── property_service.py           # search() batch-fetches DealScore; _to_summary(); get_detail()
│   ├── comps_service.py              # Haversine + 6-signal similarity rank
│   ├── neighborhood_service.py       # Census + FBI Crime; _to_dict() surfaces FBI raw_sources
│   ├── market_service.py             # Market stats; commits to DB
│   ├── user_service.py               # Saved props/searches + update_profile/preferences/password
│   ├── auth_service.py               # register, login, refresh, logout
│   ├── geocoding_service.py          # Autocomplete
│   ├── ai/
│   │   ├── scoring_engine.py         # 6-component rule-based scoring; uses raw FBI rates
│   │   │                             # (violent/property per 100k) over normalized index
│   │   ├── claude_analyzer.py        # Claude API integration
│   │   ├── deal_score_service.py     # get_or_compute; uses selectinload; commits score
│   │   └── valuation_model.py        # GradientBoosting AVM
│   ├── alerts/email_service.py
│   └── data_sources/
│       ├── base.py                   # BaseDataSource
│       ├── registry.py               # DataSourceRegistry
│       ├── rentcast_adapter.py
│       ├── attom_adapter.py
│       ├── fred_adapter.py
│       ├── census_adapter.py
│       ├── fbi_crime_adapter.py      # /summarized/state/{STATE}/{offense-type}, MM-YYYY dates
│       └── http_client.py
└── tasks/
    ├── celery_app.py
    ├── data_sync.py
    ├── alerts.py
    ├── maintenance.py
    └── ml_training.py

frontend/src/
├── app/
│   ├── page.tsx                      # Home hero
│   ├── search/page.tsx               # Split-pane results + map
│   ├── property/[id]/page.tsx        # Property detail (SSR wrapper)
│   ├── favorites/page.tsx            # Watchlist — saved properties grid
│   ├── map/page.tsx                  # Full-screen map
│   ├── profile/page.tsx              # Profile: account, notification prefs, change password
│   └── auth/{login,register}/page.tsx
├── components/
│   ├── layout/Navbar.tsx             # Search | Map | Watchlist (auth only) | profile chip | sign out
│   ├── search/
│   │   ├── SearchBar.tsx             # Input + localStorage history dropdown (8 entries)
│   │   ├── FilterPanel.tsx
│   │   └── PropertyList.tsx
│   ├── property/
│   │   ├── PropertyDetailClient.tsx  # Photo gallery or satellite fallback
│   │   ├── PriceHistoryChart.tsx
│   │   ├── TaxHistoryPanel.tsx
│   │   ├── CompsPanel.tsx
│   │   ├── NeighborhoodPanel.tsx     # Schools, walk/transit, income/population (no crime)
│   │   ├── CrimePanel.tsx            # FBI data: grade chip, crime index, violent/property/total
│   │   │                             # rate bars vs national averages
│   │   ├── MarketPanel.tsx
│   │   ├── InterestRatesPanel.tsx
│   │   ├── DealScorePanel.tsx
│   │   └── AVMPanel.tsx
│   ├── map/PropertyMap.tsx           # Color-coded markers, mapReady guard, legend
│   │                                 # Land parcels: dark forest green (#2e7d32)
│   ├── ui/
│   │   ├── HudCard.tsx
│   │   ├── StatBadge.tsx
│   │   └── DealScoreMeter.tsx        # Animated circular gauge; container height = SVG height
│   └── providers/QueryProvider.tsx
├── lib/
│   ├── api-client.ts                 # Axios, 30s timeout; updateProfile, updatePreferences,
│   │                                 # changePassword methods
│   ├── hooks/useProperty.ts          # useProperty, usePriceHistory, useDealScore
│   ├── hooks/useSearch.ts
│   └── store/authStore.ts            # User type includes preferences + created_at; updateUser action
└── __tests__/
    ├── Navbar.test.tsx
    ├── SearchBar.test.tsx
    └── RegisterPage.test.tsx
```

---

## Testing

### Backend — pytest (no live connections)

```bash
# Install test deps inside the container (kept out of requirements.txt)
docker compose exec backend pip install pytest==8.3.3 pytest-asyncio==0.24.0 httpx==0.27.2

# Run all tests
docker compose exec backend python -m pytest tests/ -v

# Run a specific file
docker compose exec backend python -m pytest tests/test_properties.py -v
```

Config: `backend/pytest.ini` — `asyncio_mode = auto`, `testpaths = tests`.

**Fixtures** (`tests/conftest.py`):
- `client` — unauthenticated `AsyncClient` with mocked DB (`get_db` override)
- `auth_client` — authenticated client; `get_current_user` overridden to return `mock_user`
- `mock_user` — `MagicMock` with `email="test@example.com"`, `full_name="Test User"`
- `patch_startup` (session-scoped, autouse) — patches `initialize_registry` and `close_redis` so tests don't need a live PostgreSQL or Redis instance

| File | What it tests |
|---|---|
| `test_health.py` | `GET /health` — status, version, app name |
| `test_auth.py` | Register (success, duplicate email → 409, invalid email → 422, missing fields → 422), login (success, bad creds → 401), refresh (success, invalid → 401), logout → 204 |
| `test_properties.py` | Search (no params, by city, by ZIP, price filter, limit > 100 → 422), detail (found, not found → 404), score (found, not found → 404), comps, price-history, AVM |
| `test_search.py` | Autocomplete (returns suggestions, min 2 chars enforced → 422, empty results) |
| `test_users.py` | `GET /users/me` (auth, unauth → 401), saved properties (list, save → 201, remove → 204), saved searches (list, create → 201, update, update not-found → 404, delete → 204) |
| `test_market.py` | `GET /market/rates/current`, `GET /market/{zip}` |

### Frontend — vitest

```bash
cd frontend && npm test               # single run
cd frontend && npm run test:watch     # watch mode
```

Tests live in `frontend/src/__tests__/`. Components that use `next/navigation` or Zustand stores are mocked at the test module level.

| File | What it tests |
|---|---|
| `Navbar.test.tsx` | Renders nav links, conditional rendering based on auth state, logout |
| `SearchBar.test.tsx` | Input rendering, initial value prop, history dropdown, submission + navigation |
| `RegisterPage.test.tsx` | Form fields, validation, API call, error handling, success redirect |

### Live API diagnostic

```bash
docker compose exec backend python scripts/test_apis.py
```

Tests: RentCast (listings, properties, markets), FRED (mortgage rate), Census (ACS5 income), ATTOM (snapshot + detail), FBI Crime (agency list, violent-crime, property-crime, FBICrimeAdapter end-to-end), API Ninjas (city lookup), Anthropic (messages.create), Mapbox (token validation).

---

## Known Architecture Decisions & Bug History

### SQLAlchemy async relationships — always use selectinload
Accessing a lazy-loaded relationship (`price_history`, `tax_history`, `deal_scores`) outside the initial `await` raises `MissingGreenlet`. This has caused bugs in `deal_score_service.py`, `property_service.py`. Always load eagerly:

```python
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(Property)
    .options(selectinload(Property.price_history), selectinload(Property.tax_history))
    .where(Property.id == uid)
)
```

### All writes must use commit(), not flush()
`flush()` makes data visible within the session but rolls back when the request ends. Every service that writes must call `await db.commit()`. Affected in past bugs: `user_service`, `neighborhood_service`, `market_service`, `deal_score_service`. Pattern:

```python
self.db.add(obj)
await self.db.commit()
await self.db.refresh(obj)
```

### SQLAlchemy identity map stale state after commit
After a `DELETE` + `INSERT` within the same request, call `self.db.expire_all()` before re-fetching to force the ORM to reload from DB rather than returning the pre-delete cached state. Used in `property_service.get_detail()` when replacing synthetic price history.

### Decimal schema fields serialize as strings
SQLAlchemy `Numeric`/`Decimal` columns serialize as JSON strings in Pydantic v2. Any field the frontend will use as a number must be `float` in the Pydantic schema. Affected fields: `lat`, `lng`, `current_price`, `baths`, `lot_size_acres`, `ComparableSale.price`, `ComparableSale.price_per_sqft`, `PriceEvent.price`, `TaxRecord.assessed_value`, `TaxRecord.tax_amount`.

### Mapbox CSS must be imported
`mapbox-gl/dist/mapbox-gl.css` must be statically imported at the top of `PropertyMap.tsx`. Without it, map controls and markers are invisible even though the map renders.

### Mapbox marker race condition — mapReady guard
`PropertyMap` initializes the map asynchronously (dynamic import + `new Map()`). The marker `useEffect` must list `mapReady` as a dependency and guard with `if (!mapRef.current || !mapReady) return`. Properties that arrive before the `load` event fires are silently dropped otherwise.

### Deal score colors on map require batch fetch
`PropertySummaryResponse.deal_score` is not a column on the `Property` table — it comes from the `deal_scores` table. `property_service.search()` calls `_batch_scores(prop_ids)` after fetching properties to get the latest valid score per property in one query, then builds responses via `_to_summary()`. Do not try to populate `deal_score` via `model_validate(prop)` directly.

### DealScoreMeter SVG overflow — container must be full height
The circular gauge SVG is `sizes.svg` pixels tall. The container div must also be `sizes.svg` tall. Any partial height (e.g. `* 0.8`) causes the SVG to overflow and overlap the grade badge below it. `overflow: hidden` clips the arc's glow filter. The correct fix is full-height container with adequate `gap` in the outer flex.

### Property DB cache staleness
`PropertyService.search()` returns cached DB rows only when at least one result was synced within the last hour (`last_synced_at` TTL check). If search returns stale or wrong data, wipe:

```bash
docker compose exec db psql -U landgrab -d landgrab -c "DELETE FROM properties;"
```

### Neighborhood cache staleness — FBI data missing
`neighborhood_data` records are cached for 24 hours. If records were created before the FBI adapter was working, they will have `raw_sources` with only a `census` key and no `fbi_crime` key. The Crime & Safety panel will show "unavailable" until the cache expires or is cleared. Fix:

```bash
docker compose exec db psql -U landgrab -d landgrab -c "DELETE FROM neighborhood_data;"
docker compose exec redis redis-cli KEYS "fbi:*" | xargs docker compose exec redis redis-cli DEL
```

New property loads will re-fetch from both Census and FBI and store the full data.

### FBI CDE API — correct endpoints and parameters
The FBI Crime Data Explorer API has non-obvious requirements that caused 404/400 errors:
- Offense type is a **path segment**, not a query param: `/summarized/state/{STATE}/violent-crime`
- Date range format is `MM-YYYY` (e.g. `01-2022`), not plain year — omitting causes HTTP 400
- Auth key is `API_KEY` as a **query param**, not a header
- Data is **state-level only** — the `city` argument to `get_crime_data()` is ignored by the API

### User preferences — JSONB column on users table
User notification preferences are stored as a JSONB column (`preferences`) on the `users` table, added via migration `b2c4d6e8f001_add_user_preferences`. The `UserResponse` schema includes a `preferences: UserPreferences` field. Frontend auth store's `User` type includes `preferences` and `created_at`. Profile page endpoints: `PATCH /users/me`, `PUT /users/preferences`, `PUT /users/password`.

### passlib + bcrypt compatibility
Pin `bcrypt<4.0.0` in `backend/requirements.txt`. bcrypt 4+ is incompatible with `passlib[bcrypt]==1.7.4` and raises `ValueError` on every auth request.

### Property detail timeout
`get_detail()` uses `asyncio.gather` with a 12-second `_with_timeout` wrapper for neighborhood, market, and tax fetches. The frontend Axios timeout is 30 seconds. ATTOM is only queried for tax history, not for price history (use `raw_data['history']` from RentCast instead).

### Adding new API data — integrate into deal scoring
When a new data source is added and returns structured metrics, update `scoring_engine.py` to incorporate those metrics into the relevant component score. FBI crime rates (`violent_rate_per_100k`, `property_rate_per_100k`) are used directly in `_score_neighborhood()` benchmarked against national averages (violent ~370/100k/yr, property ~2100/100k/yr), falling back to the normalized `crime_index` when raw rates are unavailable.

---

## Code Style

- No unnecessary comments — only add one when the WHY is non-obvious
- No docstrings unless a function's contract is genuinely surprising
- Prefer editing existing files over creating new ones
- Don't add abstractions beyond what the task requires
