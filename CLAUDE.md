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
- **AI:** Groq `llama-3.3-70b-versatile` (free, 14,400 req/day) for deal scoring (70/30 blend with rule-based engine); Anthropic Claude is optional fallback
- **Maps:** Mapbox GL JS with dark tiles, color-coded property markers
- **Data sources:** Pluggable `BaseDataSource` adapters — RentCast, FRED, Census, FBI Crime, API Ninjas; ATTOM slots in via `DataSourceRegistry` when key is present
- **Auth:** JWT (email/password) + Google OAuth (GIS button, `POST /auth/google`)

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
docker compose up -d --build  # rebuild all images then start
docker compose restart backend frontend   # restart specific services
```

### Adding or changing .env API keys

`docker compose restart` does NOT re-inject `.env` variables. To pick up new or changed keys you must **force-recreate**:

```bash
docker compose up -d --force-recreate backend celery_worker celery_beat
```

For frontend env vars (`NEXT_PUBLIC_*`) also recreate the frontend:

```bash
docker compose up -d --force-recreate backend frontend celery_worker celery_beat
```

Verify a key loaded correctly:

```bash
docker compose exec backend python -c "from app.core.config import settings; print(settings.RENTCAST_API_KEY[:4])"
```

### AVM model training

The AVM requires a trained model file at `backend/models/avm_v1.pkl` (maps to `/app/models/avm_v1.pkl` inside Docker). Run once after a fresh clone or wipe:

```bash
docker compose exec backend python scripts/train_avm.py
# Expected output: Test MAPE: ~0.09 | R²: ~0.94
# Creates: backend/models/avm_v1.pkl
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
| `GROQ_API_KEY` | Groq | Active — free LLM for deal score AI analysis (LLaMA 3.3 70B) |
| `ANTHROPIC_API_KEY` | Anthropic | Optional fallback if Groq key absent |
| `FBI_CRIME_API_KEY` | FBI CDE | Active — state-level violent + property crime rates |
| `GOOGLE_OAUTH_CLIENT_ID` | Google Cloud Console | Active — server-side token verification for OAuth |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | Google Cloud Console | Active — renders GIS button in browser (same value as above) |

### RentCast search behaviour

`search_properties` uses `/listings/sale` (active listings with asking prices) and falls back to `/properties` (property records, no price). The monthly quota is capped at 50 calls tracked in Redis under `rentcast:monthly_calls`.

**Three-layer cache to protect quota:**
1. **Search-level Redis cache** — MD5 hash of all query params as key, 24h TTL (`SEARCH_TTL`). Checked before quota counter.
2. **Property Redis cache** — per-property detail, 48h TTL (`PROPERTY_TTL`).
3. **DB freshness threshold** — `search()` skips external fetch when DB rows are <24h old (`DB_SEARCH_FRESHNESS`). Same for `get_or_fetch_by_address()` (`DB_ADDRESS_FRESHNESS`).

These constants live in `backend/app/core/redis_client.py`. Do not tighten them without understanding the quota impact.

Price history is extracted from `raw_data['history']` on each RentCast listing — a dict keyed by `YYYY-MM-DD` date with price + event metadata. This is multi-event for re-listed properties. Do not rely on ATTOM for price history (trial plan returns empty `saleHistory`).

### Groq AI (deal score)

`claude_analyzer.py` dispatches: Groq first → Anthropic fallback → None (100% rule-based).

Model: `llama-3.3-70b-versatile`, temperature 0.1, max 1024 tokens. Open-source models often wrap JSON in ` ```json ` fences — the response parser strips these before `json.loads`. Wrap `_analyze_with_groq` in `try/except Exception: return None` — any failure silently falls back to rule-based.

### FBI Crime API

Base URL: `https://api.usa.gov/crime/fbi/cde`

Correct endpoints (confirmed working):
- `/agency/byStateAbbr/{STATE}?API_KEY=...` — agency list, confirms key + connectivity
- `/summarized/state/{STATE}/violent-crime?from=MM-YYYY&to=MM-YYYY&API_KEY=...`
- `/summarized/state/{STATE}/property-crime?from=MM-YYYY&to=MM-YYYY&API_KEY=...`

`API_KEY` is a **query param**, not a header. Date format is `MM-YYYY` (e.g. `01-2022`). The adapter computes `violent_rate_per_100k`, `property_rate_per_100k`, `crime_rate_per_100k`, `crime_index` (0–100), and `crime_grade` (A–F). Data is state-level, not city-level.

### Google OAuth

Flow: Browser loads GIS script → user clicks button → Google returns ID token → frontend posts `{ credential }` to `POST /api/v1/auth/google` → backend verifies via `https://oauth2.googleapis.com/tokeninfo?id_token=...` → checks `aud == GOOGLE_OAUTH_CLIENT_ID` → calls `AuthService.google_login(google_id, email, full_name)`.

`google_login` checks by `google_id` first, then by `email` (to link existing email accounts). New users get `is_verified=True` and a random unhashable `password_hash`. The `google_id` column was added via migration `d4e6f8h0i003_add_google_id_to_users`.

The GIS button is hidden when `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` is unset. Authorized JavaScript origins must include `http://localhost:3000` in the Google Cloud Console credential.

---

## File Structure

```
backend/app/
├── main.py
├── api/v1/
│   ├── deps.py                       # get_db, get_current_user, get_admin_user
│   └── routes/
│       ├── auth.py                   # register, login, refresh, logout, POST /auth/google
│       ├── users.py                  # me, PATCH /me, PUT /preferences, PUT /password,
│       │                             # saved-properties, saved-searches, GET /usage
│       ├── properties.py             # search, detail, score, comps, avm, price-history
│       ├── search.py                 # autocomplete
│       ├── market.py                 # rates/current, /{zip}
│       └── admin.py                  # GET /admin/overview, /admin/users, PATCH /admin/users/{id}
├── core/
│   ├── config.py                     # Settings (all API keys, DB URL, JWT secret)
│   │                                 # Includes GROQ_API_KEY, GOOGLE_OAUTH_CLIENT_ID
│   ├── database.py                   # async_sessionmaker, get_db
│   ├── redis_client.py               # cache_get, cache_set, cache_delete
│   │                                 # PROPERTY_TTL=48h, SEARCH_TTL=24h, MARKET_TTL=24h
│   │                                 # DB_SEARCH_FRESHNESS=24h, DB_ADDRESS_FRESHNESS=24h
│   └── security.py                   # JWT, bcrypt
├── models/
│   ├── property.py                   # Property, PriceHistory, TaxHistory, PriceEventType
│   ├── deal_score.py                 # DealScore (property_id FK, score, expires_at)
│   ├── user.py                       # User (+ preferences JSONB + google_id), SavedProperty,
│   │                                 # SavedSearch
│   ├── neighborhood.py               # NeighborhoodData
│   ├── market.py                     # MarketData
│   ├── alert.py                      # PriceAlert
│   └── ml.py                         # MLModelMetrics
├── schemas/
│   ├── property.py                   # PropertyBase, PropertySummaryResponse (+ deal_score),
│   │                                 # PropertyDetailResponse, ComparableSale (+ lot_size_acres),
│   │                                 # PriceEvent, TaxRecord, DealScoreSummary, NeighborhoodSummary
│   │                                 # (+ crime_rate_per_100k, violent_rate_per_100k,
│   │                                 # property_rate_per_100k), MarketSummary
│   └── user.py                       # UserPreferences, UserProfileUpdate, UserPasswordUpdate,
│                                     # UserResponse (+ preferences, created_at),
│                                     # AdminUserItem (+ views_used)
├── services/
│   ├── property_service.py           # search() batch-fetches DealScore; _to_summary(); get_detail()
│   ├── comps_service.py              # Haversine + land-aware similarity rank
│   │                                 # Land: lot_size_acres + price/acre signals
│   │                                 # Non-land: sqft/beds/baths/year signals
│   ├── neighborhood_service.py       # Census + FBI Crime; _to_dict() surfaces FBI raw_sources
│   ├── market_service.py             # Market stats; commits to DB
│   ├── user_service.py               # Saved props/searches + update_profile/preferences/password
│   ├── auth_service.py               # register, login, refresh, logout, google_login
│   ├── admin_service.py              # get_overview(), get_users() (+ monthly views_used from Redis)
│   ├── usage_service.py              # track_view(), get_usage(); Redis key: user:view_count:{id}:{YYYY-MM}
│   │                                 # Free tier: 5 views/month. Pro: unlimited.
│   ├── geocoding_service.py          # Autocomplete
│   ├── ai/
│   │   ├── scoring_engine.py         # 6-component rule-based scoring; uses raw FBI rates
│   │   │                             # (violent/property per 100k) over normalized index
│   │   ├── claude_analyzer.py        # Groq (primary) → Anthropic (fallback) → None
│   │   │                             # format_property_briefing() unchanged
│   │   ├── deal_score_service.py     # get_or_compute; uses selectinload; commits score
│   │   └── valuation_model.py        # GradientBoosting AVM; MODEL_PATH=/app/models/avm_v1.pkl
│   ├── alerts/email_service.py
│   └── data_sources/
│       ├── base.py                   # BaseDataSource
│       ├── registry.py               # DataSourceRegistry
│       ├── rentcast_adapter.py       # search_properties: Redis search cache (MD5 key, 24h)
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

backend/scripts/
├── test_apis.py                      # Live API diagnostic (pass/fail per adapter)
└── train_avm.py                      # One-time AVM training; saves backend/models/avm_v1.pkl
                                      # 5,000 synthetic samples, GBR(n=300, lr=0.05, depth=5)
                                      # Expected: MAPE ~9%, R² ~0.94

backend/alembic/versions/
├── ...initial migrations...
├── b2c4d6e8f001_add_user_preferences.py
└── d4e6f8h0i003_add_google_id_to_users.py  # google_id String(128) nullable unique indexed

frontend/src/
├── app/
│   ├── page.tsx                      # Home hero
│   ├── search/page.tsx               # Split-pane results + map
│   ├── property/[id]/page.tsx        # Property detail (SSR wrapper)
│   ├── favorites/page.tsx            # Watchlist — saved properties grid
│   ├── map/page.tsx                  # Full-screen map
│   ├── profile/page.tsx              # Profile: account, notification prefs, change password
│   ├── admin/page.tsx                # Admin: overview stats + user management table
│   │                                 # Shows views_used/month per user (from Redis)
│   └── auth/{login,register}/page.tsx  # Email/password + Google GIS button
├── components/
│   ├── layout/Navbar.tsx             # Search | Map | Watchlist (auth only) | profile chip | sign out
│   ├── search/
│   │   ├── SearchBar.tsx             # Input + localStorage history dropdown (8 entries)
│   │   ├── FilterPanel.tsx
│   │   └── PropertyList.tsx
│   ├── property/
│   │   ├── PropertyDetailClient.tsx  # Photo gallery or satellite fallback
│   │   │                             # Land: shows $/acre + green acres highlight
│   │   │                             # Passes propertyType to CompsPanel + MarketPanel
│   │   ├── PriceHistoryChart.tsx
│   │   ├── TaxHistoryPanel.tsx
│   │   ├── CompsPanel.tsx            # Land: "COMPARABLE LAND LISTINGS", shows acres + $/acre
│   │   │                             # Non-land: sqft + $/sqft as before
│   │   ├── NeighborhoodPanel.tsx     # Schools, walk/transit, income/population (no crime)
│   │   ├── CrimePanel.tsx            # FBI data: grade chip, crime index, violent/property/total
│   │   │                             # rate bars vs national averages
│   │   ├── MarketPanel.tsx           # Accepts propertyType; hides Price/sqft for land
│   │   ├── InterestRatesPanel.tsx
│   │   ├── DealScorePanel.tsx
│   │   └── AVMPanel.tsx
│   ├── map/PropertyMap.tsx           # Color-coded markers, mapReady guard, legend
│   │                                 # Land parcels: dark forest green (#2e7d32)
│   ├── ui/
│   │   ├── HudCard.tsx
│   │   ├── StatBadge.tsx
│   │   ├── DealScoreMeter.tsx        # Animated circular gauge; container height = SVG height
│   │   └── ProGate.tsx               # Locks panel content behind free-tier view limit
│   └── providers/QueryProvider.tsx
├── lib/
│   ├── api-client.ts                 # Axios, 30s timeout
│   │                                 # 401 interceptor: clears localStorage AND resets Zustand
│   │                                 # auth state via dynamic import (avoids circular dep)
│   ├── hooks/
│   │   ├── useProperty.ts            # useProperty, usePriceHistory, useDealScore, useComps, useAVM
│   │   ├── useSearch.ts
│   │   └── useUsage.ts               # canView, viewsUsed, viewsLimit, isUnlimited
│   └── store/authStore.ts            # isInitialized flag guards premature redirects
│                                     # loginWithGoogle action calls api.googleLogin()
│                                     # User type includes preferences + created_at
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

Tests: RentCast (listings, properties, markets), FRED (mortgage rate), Census (ACS5 income), ATTOM (snapshot + detail), FBI Crime (agency list, violent-crime, property-crime, FBICrimeAdapter end-to-end), API Ninjas (city lookup), Groq (chat completion), Mapbox (token validation).

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
`PropertyService.search()` returns cached DB rows only when at least one result was synced within the last 24 hours (`DB_SEARCH_FRESHNESS`). If search returns stale or wrong data, wipe:

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

### isInitialized auth pattern — prevents premature redirects
The Zustand auth store has `isInitialized: boolean` that starts as:
- `true` immediately when there is **no** token in localStorage (confirmed unauthenticated, no network check needed)
- `false` when a token exists (must verify it via `loadUser()` before deciding)

`loadUser()` sets `isInitialized: true` on both success and failure. Every protected page must gate both its render and its redirect on `isInitialized`:

```tsx
// Guard redirect (don't redirect until we know auth state)
useEffect(() => {
  if (isInitialized && !isAuthenticated) router.replace("/auth/login");
}, [isInitialized, isAuthenticated, router]);

// Guard render (prevent flash of content before redirect)
if (!isInitialized || !isAuthenticated) return null;
```

### 401 response clears auth state across all pages
The `api-client.ts` 401 interceptor uses a dynamic import of `authStore` to reset Zustand state when any request gets a 401 (expired token). This ensures all pages consistently redirect to login rather than some pages showing stale React Query cache while others redirect. The dynamic import avoids the circular dependency `api-client → authStore → api-client`.

### Land property comps — different similarity signals
`comps_service.py` detects `is_land = str(subject.property_type) == "land"` and switches the entire similarity scoring logic:
- **Land**: lot_size_acres (40pt max) + price_per_acre proximity (25pt max) + distance (10pt)
- **Non-land**: sqft (40pt) + beds (20pt) + baths (12pt) + year_built (15pt) + price_per_sqft (15pt) + distance (10pt)

The `ComparableSale` schema includes `lot_size_acres: Optional[float]`. The sqft hard-filter (±50%) is skipped for land since sqft is not populated on raw land parcels.

### Admin monthly views — Redis key pattern
`admin_service.get_users()` fetches the current month's view count per user from Redis using key `user:view_count:{user_id}:{YYYY-MM}`. This is the same key written by `usage_service.track_view()`. The `AdminUserItem` schema includes `views_used: int = 0`. Pro users display `∞`, free users display `N/5`.

### Google OAuth — circular account linking
`AuthService.google_login()` looks up by `google_id` first, then falls back to `email`. This means an existing email/password account is silently linked when the user signs in with Google for the first time using the same email. The `google_id` is then stored on the user record and future Google logins use that path.

### AVM model path — Docker vs host
`valuation_model.py` uses `MODEL_PATH = "/app/models/avm_v1.pkl"`. Inside Docker, `/app` is the volume-mounted `backend/` directory. The file must exist at `backend/models/avm_v1.pkl` on the host. If the `models/` directory does not exist, `train_avm.py` creates it. The AVM returns `{"status": "unavailable"}` when the pkl file is missing — run `train_avm.py` to fix.

---

## Code Style

- No unnecessary comments — only add one when the WHY is non-obvious
- No docstrings unless a function's contract is genuinely surprising
- Prefer editing existing files over creating new ones
- Don't add abstractions beyond what the task requires
