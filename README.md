# ■ LANDGRAB

**Real estate buyer intelligence platform.** LandGrab aggregates property data, AI deal scoring, neighborhood analytics, and live mortgage rates into one tactical dashboard so buyers can instantly judge whether a property is a deal.

> Dark, data-dense, no fluff. Think Bloomberg terminal for house hunting.

---

## Features

- **AI Deal Scoring** — Rule-based component scores (comps, market timing, neighborhood, growth, tax burden, price trend) blended 70/30 with Claude AI analysis. Every property gets a 0–100 score, letter grade (A–F), animated circular gauge, and a plain-English verdict. Scores cache 12 hours in the database.
- **Color-Coded Map Markers** — Mapbox dark tiles with property pins color-coded by deal score (green ≥75, amber 50–74, red <50, cyan unscored, dark green for land parcels). Deal scores are batch-fetched with search results so colors reflect real data on load.
- **Property Photos & Aerial View** — Displays listing photos when available. Falls back to a Mapbox satellite aerial view using the existing map token when no photos exist.
- **Price & Tax History** — Full historical charts. Price history extracted from RentCast `raw_data.history` (multi-event per listing including re-lists and price changes). Tax history from ATTOM when available.
- **Comparable Sales** — Haversine-filtered, multi-signal similarity ranking: sqft (±50%), beds, baths, year built, price/sqft proximity, distance, property type. Returns the 5 best-matched active listings.
- **Neighborhood Intel** — Crime index, school ratings, walk/transit/bike scores, Census demographic trends.
- **Market Data** — Median price, days on market, months of supply, YoY price change per ZIP code.
- **Live Mortgage Rates** — FRED API 30yr/15yr rates with built-in payment calculator (adjust down payment %, loan term).
- **LandGrab Estimate (AVM)** — GradientBoosting ML model trained on local sales data. Shows estimated value vs list price with confidence range.
- **Search History** — Recent searches persist in localStorage (up to 8 entries) and appear as a dropdown on focus.
- **Favorites / Watchlist** — Save properties to a watchlist. Saved properties show beds/baths/sqft stats and current price. Accessible via the Watchlist nav tab.
- **Pluggable Data Sources** — All adapters implement `BaseDataSource`. Paid sources (ATTOM, GreatSchools, Walk Score) slot in with no route changes.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend API | Python 3.12 + FastAPI (async) |
| Database | PostgreSQL 16 + SQLAlchemy (async) + Alembic |
| Cache + Queue | Redis 7 + Celery |
| AI | Claude API (`claude-sonnet-4-6`) + scikit-learn |
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS — custom black ops theme |
| Maps | Mapbox GL JS (dynamic import, dark-v11 tiles) |
| Charts | Recharts |
| State | Zustand + TanStack Query |
| Infra | Docker + Docker Compose |

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running)
- [Node.js 20+](https://nodejs.org/) (for local frontend dev only)

### 1. Configure API Keys

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
# Required for property listings
RENTCAST_API_KEY=           # https://app.rentcast.io/ (50 free calls/month)

# Required for maps (browser-side)
NEXT_PUBLIC_MAPBOX_TOKEN=   # https://account.mapbox.com/ (free tier)

# Required for mortgage rates
FRED_API_KEY=               # https://fred.stlouisfed.org/docs/api/api_key.html

# Required for neighborhood demographics
CENSUS_API_KEY=             # https://api.census.gov/data/key_signup.html

# Optional — AI narrative in deal scoring (falls back to rule-based only)
ANTHROPIC_API_KEY=          # https://console.anthropic.com/

# Optional — enriches tax history and property details
ATTOM_API_KEY=              # https://api.attomdata.com/

# Optional — city/ZIP supplemental data
API_NINJAS_KEY=             # https://api-ninjas.com/
```

All keys are optional — adapters degrade gracefully when missing.

### 2. Start the Stack

```bash
docker compose up -d --build
```

| Service | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (FastAPI) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 3. Run Migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Verify

```bash
curl http://localhost:8000/health
# → {"status":"operational","version":"1.0.0","app":"LandGrab"}

curl "http://localhost:8000/api/v1/properties?city=Tulsa&state=OK"
curl http://localhost:8000/api/v1/market/rates/current
```

### 5. Stop the Stack

```bash
docker compose down
```

---

## Project Structure

```
LandGrab/
├── backend/
│   ├── app/
│   │   ├── main.py                       # FastAPI app entry point, lifespan hooks
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py             # Route registration
│   │   │       ├── deps.py               # Shared dependencies (get_db, get_current_user)
│   │   │       └── routes/
│   │   │           ├── auth.py           # POST /auth/register|login|refresh|logout
│   │   │           ├── users.py          # GET|POST|DELETE /users/me|saved-properties|saved-searches
│   │   │           ├── properties.py     # GET /properties, /properties/{id}, /score, /comps, /avm
│   │   │           ├── search.py         # GET /search/autocomplete
│   │   │           └── market.py         # GET /market/rates/current, /market/{zip}
│   │   ├── core/
│   │   │   ├── config.py                 # Settings (all API keys, DB URL, JWT secret)
│   │   │   ├── database.py               # Async SQLAlchemy engine + session factory
│   │   │   ├── redis_client.py           # Redis cache helpers (get/set/delete)
│   │   │   └── security.py               # JWT encode/decode, bcrypt password hashing
│   │   ├── models/
│   │   │   ├── user.py                   # User, SavedProperty, SavedSearch
│   │   │   ├── property.py               # Property, PriceHistory, TaxHistory
│   │   │   ├── neighborhood.py           # NeighborhoodData
│   │   │   ├── market.py                 # MarketData
│   │   │   ├── deal_score.py             # DealScore (12h expiry, per-property)
│   │   │   ├── alert.py                  # PriceAlert
│   │   │   └── ml.py                     # MLModelMetrics
│   │   ├── schemas/
│   │   │   ├── auth.py                   # RegisterRequest, TokenResponse
│   │   │   ├── user.py                   # UserResponse, SavedPropertyResponse
│   │   │   └── property.py               # PropertyBase, PropertySummaryResponse,
│   │   │                                 #   PropertyDetailResponse, ComparableSale,
│   │   │                                 #   PriceEvent, TaxRecord, DealScoreSummary,
│   │   │                                 #   NeighborhoodSummary, MarketSummary
│   │   ├── services/
│   │   │   ├── property_service.py       # Search (1h cache + batch score lookup),
│   │   │   │                             #   get_detail, price/tax history extraction
│   │   │   ├── comps_service.py          # Haversine filter + 6-signal similarity rank
│   │   │   ├── neighborhood_service.py   # Census + FBI Crime fetch + DB cache
│   │   │   ├── market_service.py         # Market stats fetch + DB cache
│   │   │   ├── user_service.py           # Saved properties + searches CRUD
│   │   │   ├── auth_service.py           # Register, login, refresh, logout
│   │   │   ├── geocoding_service.py      # Autocomplete (API Ninjas + Census fallback)
│   │   │   ├── ai/
│   │   │   │   ├── scoring_engine.py     # 6-component rule-based score
│   │   │   │   ├── claude_analyzer.py    # Claude API with prompt caching
│   │   │   │   ├── deal_score_service.py # 70/30 blend, selectinload, 12h DB cache
│   │   │   │   └── valuation_model.py    # GradientBoosting AVM
│   │   │   ├── alerts/
│   │   │   │   └── email_service.py      # Price drop + new listing email alerts
│   │   │   └── data_sources/
│   │   │       ├── base.py               # BaseDataSource interface
│   │   │       ├── registry.py           # DataSourceRegistry (priority routing)
│   │   │       ├── rentcast_adapter.py   # Primary listings source (/listings/sale)
│   │   │       ├── attom_adapter.py      # ATTOM (tax history, property detail)
│   │   │       ├── fred_adapter.py       # Mortgage rates
│   │   │       ├── census_adapter.py     # ACS demographics
│   │   │       ├── fbi_crime_adapter.py  # Crime index by city
│   │   │       └── http_client.py        # Shared async HTTP client
│   │   └── tasks/
│   │       ├── celery_app.py             # Celery worker + beat config
│   │       ├── data_sync.py              # Weekly Redfin CSV download
│   │       ├── alerts.py                 # Price drop + new listing checks
│   │       ├── maintenance.py            # Expire old deal scores daily
│   │       └── ml_training.py            # Monthly AVM retrain
│   ├── alembic/                          # Database migrations
│   ├── tests/
│   │   ├── conftest.py                   # Fixtures: client, auth_client, mock_user
│   │   ├── test_health.py                # Health endpoint
│   │   ├── test_auth.py                  # Register, login, refresh, logout
│   │   ├── test_properties.py            # Search, detail, score, comps, AVM
│   │   ├── test_search.py                # Autocomplete endpoint
│   │   ├── test_users.py                 # Profile, saved properties, saved searches
│   │   └── test_market.py                # Mortgage rates, market data by ZIP
│   ├── scripts/
│   │   └── test_apis.py                  # Live API diagnostic (pass/fail per adapter)
│   ├── pytest.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx                # Root layout (Navbar, QueryProvider, fonts)
│   │   │   ├── page.tsx                  # Home — hero search bar
│   │   │   ├── globals.css               # Tailwind base + custom utility classes
│   │   │   ├── search/
│   │   │   │   └── page.tsx              # Split-pane results (list + Mapbox map)
│   │   │   ├── property/[id]/
│   │   │   │   └── page.tsx              # Property detail page (SSR wrapper)
│   │   │   ├── favorites/
│   │   │   │   └── page.tsx              # Watchlist — saved properties grid
│   │   │   ├── map/
│   │   │   │   └── page.tsx              # Full-screen map view
│   │   │   └── auth/
│   │   │       ├── login/page.tsx
│   │   │       └── register/page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── Navbar.tsx            # Nav links: Search | Map | Watchlist | auth
│   │   │   ├── search/
│   │   │   │   ├── SearchBar.tsx         # Input + localStorage history dropdown (8 entries)
│   │   │   │   ├── FilterPanel.tsx       # Price / beds / type filters
│   │   │   │   └── PropertyList.tsx      # Search result cards
│   │   │   ├── property/
│   │   │   │   ├── PropertyDetailClient.tsx  # Full detail layout + photo hero
│   │   │   │   ├── PriceHistoryChart.tsx     # Recharts area chart
│   │   │   │   ├── TaxHistoryPanel.tsx       # Annual tax history table
│   │   │   │   ├── CompsPanel.tsx            # Comparable sales table
│   │   │   │   ├── NeighborhoodPanel.tsx     # Crime, schools, walk/transit scores
│   │   │   │   ├── MarketPanel.tsx           # ZIP market stats
│   │   │   │   ├── InterestRatesPanel.tsx    # Live rates + payment calculator
│   │   │   │   ├── DealScorePanel.tsx        # Score breakdown + AI narrative
│   │   │   │   └── AVMPanel.tsx              # ML valuation estimate
│   │   │   ├── map/
│   │   │   │   └── PropertyMap.tsx       # Mapbox GL JS map with color-coded markers
│   │   │   ├── ui/
│   │   │   │   ├── HudCard.tsx           # Styled card with HUD label
│   │   │   │   ├── StatBadge.tsx         # Stat chip component
│   │   │   │   └── DealScoreMeter.tsx    # Animated circular gauge (score + grade)
│   │   │   └── providers/
│   │   │       └── QueryProvider.tsx     # TanStack Query client provider
│   │   ├── lib/
│   │   │   ├── api-client.ts             # Axios wrapper (30s timeout), typed methods
│   │   │   ├── hooks/
│   │   │   │   ├── useProperty.ts        # useProperty, usePriceHistory, useDealScore
│   │   │   │   └── useSearch.ts          # useSearch with filter params
│   │   │   └── store/
│   │   │       └── authStore.ts          # Zustand auth state (token, user, login/logout)
│   │   └── __tests__/
│   │       ├── Navbar.test.tsx           # Nav rendering, auth state, logout
│   │       ├── SearchBar.test.tsx        # Input, history dropdown, submission
│   │       └── RegisterPage.test.tsx     # Form fields, validation, API call
│   ├── tailwind.config.ts               # Black ops palette + Orbitron/JetBrains fonts
│   ├── vitest.config.ts
│   └── package.json
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

---

## API Reference

```
GET  /health

GET  /api/v1/properties                     # Search (city, state, zip, price, beds, type, limit)
GET  /api/v1/properties/{id}                # Full detail + price/tax history
GET  /api/v1/properties/{id}/score          # Deal score (rule-based + Claude, 12h cache)
GET  /api/v1/properties/{id}/comps          # Top 5 comparable active listings
GET  /api/v1/properties/{id}/price-history  # Price event timeline
GET  /api/v1/properties/{id}/avm            # ML valuation estimate

GET  /api/v1/search/autocomplete?q=         # City/ZIP suggestions (min 2 chars)

GET  /api/v1/market/rates/current           # Live 30yr/15yr mortgage rates (FRED)
GET  /api/v1/market/{zip}                   # Area market stats by ZIP

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

GET  /api/v1/users/me
GET|POST     /api/v1/users/saved-properties
DELETE       /api/v1/users/saved-properties/{id}
GET|POST     /api/v1/users/saved-searches
PUT|DELETE   /api/v1/users/saved-searches/{id}
```

Full interactive docs at `http://localhost:8000/docs` when the stack is running.

---

## Testing

### Backend — pytest (async, no live connections required)

All tests mock the database and external services via `conftest.py` fixtures.

```bash
# Install test dependencies inside the container
docker compose exec backend pip install pytest==8.3.3 pytest-asyncio==0.24.0 httpx==0.27.2

# Run all tests
docker compose exec backend python -m pytest tests/ -v

# Run a specific file
docker compose exec backend python -m pytest tests/test_properties.py -v
```

| Test File | Coverage |
|---|---|
| `test_health.py` | `GET /health` — status, version, app name |
| `test_auth.py` | Register (success, duplicate, invalid), login (success, bad creds), refresh, logout |
| `test_properties.py` | Search (no params, by city, by ZIP, price filter, limit cap), detail (found, not found), score, comps, price-history, AVM |
| `test_search.py` | Autocomplete (results, min-length validation, empty results) |
| `test_users.py` | `/me` (auth, unauth), saved properties (list, add, remove), saved searches (list, create, update, delete, not-found) |
| `test_market.py` | Current rates, market data by ZIP |

**Fixtures** (`tests/conftest.py`):
- `client` — unauthenticated `AsyncClient` with mocked DB
- `auth_client` — authenticated client; `get_current_user` returns `mock_user`
- `mock_user` — pre-built `MagicMock` user object (test@example.com)

### Frontend — vitest

```bash
cd frontend && npm test            # single run
cd frontend && npm run test:watch  # watch mode
```

| Test File | Coverage |
|---|---|
| `Navbar.test.tsx` | Renders nav links, conditional auth state, logout |
| `SearchBar.test.tsx` | Input rendering, initial value, history dropdown, submission |
| `RegisterPage.test.tsx` | Form fields, validation, API call, error handling |

### Live API Diagnostic

Tests every configured external API and reports pass/fail with sample data:

```bash
docker compose exec backend python scripts/test_apis.py
```

---

## Data Sources

### Active

| Source | Key | Data |
|---|---|---|
| RentCast | `RENTCAST_API_KEY` | Active listings (`/listings/sale`), property records, price history in `raw_data.history`. 50 calls/month free; quota tracked in Redis. |
| FRED | `FRED_API_KEY` | 30yr/15yr fixed mortgage rates |
| US Census ACS | `CENSUS_API_KEY` | Demographics, income, population trends |
| FBI Crime API | `FBI_CRIME_API_KEY` | Crime index by city |
| API Ninjas | `API_NINJAS_KEY` | City/ZIP supplemental data for autocomplete |
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Dark map tiles + satellite aerial property views |

### Optional / Paid

| Source | Key | Data |
|---|---|---|
| ATTOM | `ATTOM_API_KEY` | Tax history, property detail (trial plan restricts some endpoints) |
| Anthropic | `ANTHROPIC_API_KEY` | Claude AI narrative in deal scoring (falls back to rule-based only without it) |

Add any key to `.env`, then force-recreate to inject it:

```bash
docker compose up -d --force-recreate backend celery_worker celery_beat
```

---

## AI Deal Scoring

Two-layer approach to balance cost and quality:

**Layer 1 — Rule-based component scores (deterministic, no API cost):**

| Component | Signal |
|---|---|
| Price vs Comps | How far below/above comparable active listings |
| Market Timing | Months of supply, inventory trend |
| Neighborhood | Crime grade, school rating, walkability |
| Growth Potential | Population trend, permit data |
| Tax Burden | Effective tax rate vs area median |
| Price Trend | YoY price change direction |

**Layer 2 — Claude analysis (30% of final score, optional):**
- Input: structured property briefing
- Output: `{adjusted_score, grade, verdict, summary, key_factors, risks, opportunities}`
- Final score = rule-based × 0.70 + Claude × 0.30
- Cached in `deal_scores` table for 12 hours per property
- Falls back to 100% rule-based when `ANTHROPIC_API_KEY` is not set

---

## Map Marker Colors

| Color | Meaning |
|---|---|
| `#00ff41` neon green | Deal score ≥ 75 — strong deal |
| `#f59e0b` amber | Deal score 50–74 — moderate |
| `#ef4444` red | Deal score < 50 — weak |
| `#00d4ff` cyan | No score yet (visit property page to compute) |
| `#2e7d32` dark green | Land parcel |

Deal scores are batch-fetched alongside search results so colors reflect actual scores on initial load.

---

## Background Tasks (Celery Beat)

| Task | Schedule | Job |
|---|---|---|
| `sync_redfin_weekly` | Monday 3am | Download + parse Redfin sales CSV |
| `check_price_drops` | Every 6h | Alert users when a saved property price drops |
| `check_new_listings` | Every 2h | Alert users when a saved search has new matches |
| `expire_old_scores` | Daily 2am | Clear expired deal scores for recompute |
| `retrain_avm` | Monthly | Retrain GradientBoosting AVM on latest sales data |

Run tasks manually:

```bash
docker compose exec celery_worker celery -A app.tasks.celery_app call app.tasks.maintenance.expire_old_scores
docker compose exec celery_worker celery -A app.tasks.celery_app call app.tasks.data_sync.sync_redfin_weekly
```

---

## Development

### Hot reload (default)
The backend and frontend both hot-reload via Docker volume mounts. Just edit files locally — changes reflect immediately without a restart.

### After adding API keys
```bash
# Edit .env, then force-recreate to inject new env vars:
docker compose up -d --force-recreate backend celery_worker celery_beat

# Verify a key loaded:
docker compose exec backend python -c "from app.core.config import settings; print(settings.RENTCAST_API_KEY[:4])"
```

### Wipe stale property cache
If search returns outdated data from a previous adapter version:
```bash
docker compose exec db psql -U landgrab -d landgrab -c "DELETE FROM properties;"
```
The next search re-fetches fresh data from RentCast.

### Frontend locally (faster HMR)
```bash
cd frontend && npm install && npm run dev
```

---

## Roadmap

- [x] Phase 1 — Docker infrastructure + database schema
- [x] Phase 2 — Data source adapters (FRED, Census, RentCast, FBI Crime, API Ninjas)
- [x] Phase 3 — Frontend shell + Mapbox map (color-coded markers, search history, watchlist)
- [x] Phase 4 — Property detail page (photos, price/tax history, comps, neighborhood, market, rates)
- [x] Phase 5 — AI deal scoring (Claude + rule-based blend, animated gauge, score colors on map)
- [x] Phase 6 — Auth + saved properties + email alerts
- [ ] Phase 7 — ML valuation model (AVM training pipeline)
- [ ] Phase 8 — Mobile app (React Native)
- [ ] Phase 9 — ATTOM full integration (paid data tier)

---

## License

MIT
