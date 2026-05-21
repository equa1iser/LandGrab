# ■ LANDGRAB

**Real estate buyer intelligence platform.** LandGrab aggregates property data, AI deal scoring, neighborhood analytics, and live mortgage rates into one tactical dashboard so buyers can instantly judge whether a property is a deal.

> Dark, data-dense, no fluff. Think Bloomberg terminal for house hunting.

---

## Features

- **AI Deal Scoring** — Rule-based component scores (comps, market timing, neighborhood, growth, tax burden, price trend) blended 70/30 with LLM analysis via Groq (LLaMA 3.3 70B, free). Every property gets a 0–100 score, letter grade (A–F), animated circular gauge, and a plain-English verdict. Scores cache 12 hours.
- **Color-Coded Map Markers** — Mapbox dark tiles with property pins color-coded by deal score (green ≥75, amber 50–74, red <50, cyan unscored, dark green for land parcels). Deal scores are batch-fetched with search results so colors reflect real data on load.
- **Property Photos & Aerial View** — Displays listing photos when available. Falls back to a Mapbox satellite aerial view using the existing map token when no photos exist.
- **Price & Tax History** — Full historical charts. Price history extracted from RentCast `raw_data.history` (multi-event per listing including re-lists and price changes). Tax history from ATTOM when available.
- **Comparable Listings** — Haversine-filtered, multi-signal similarity ranking. For standard properties: sqft (±50%), beds, baths, year built, price/sqft proximity, distance. For **land parcels**: acreage and price/acre signals instead. Returns the 5 best-matched active listings.
- **Land-Aware Property Detail** — Land listings show price/acre (not price/sqft), acreage highlighted in the spec bar, comparable panel relabeled "COMPARABLE LAND LISTINGS" with per-comp $/acre, and market conditions hide the irrelevant sqft stat.
- **Crime & Safety Panel** — Dedicated FBI Crime Data panel with letter grade, crime index gauge, and violent/property crime rate bars benchmarked against national averages.
- **Neighborhood Intel** — School ratings, walk/transit/bike scores, Census demographic trends (separate from crime data).
- **Market Data** — Median price, days on market, months of supply, YoY price change per ZIP code.
- **Live Mortgage Rates** — FRED API 30yr/15yr rates with built-in payment calculator (adjust down payment %, loan term).
- **LandGrab Estimate (AVM)** — GradientBoosting ML model trained on synthetic data. Shows estimated value vs list price with confidence range.
- **Google OAuth** — Sign in / sign up with Google. Existing email accounts are automatically linked when signing in with a matching Google account.
- **Free Tier + Pro Gate** — Free users get 5 property detail views per month. Premium panels lock with a "Upgrade to Pro" prompt when the limit is reached.
- **Admin Dashboard** — Overview stats (users, properties, scores) and user management table with tier, status, and monthly view count per user.
- **Search History** — Recent searches persist in localStorage (up to 8 entries) and appear as a dropdown on focus.
- **Favorites / Watchlist** — Save properties to a watchlist. Accessible via the Watchlist nav tab (auth-gated).
- **Profile Page** — Edit name/email, manage notification preferences, change password.
- **Pluggable Data Sources** — All adapters implement `BaseDataSource`. Paid sources (ATTOM, GreatSchools, Walk Score) slot in with no route changes.
- **React Native Mobile App** — Expo / React Native companion app with property search, map view, property detail, saved properties, and auth. Full OpenTelemetry tracing (navigation spans + HTTP spans with `traceparent` propagation) so mobile sessions appear as `landgrab-mobile` in SigNoz alongside backend services.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend API | Python 3.12 + FastAPI (async) |
| Database | PostgreSQL 16 + SQLAlchemy (async) + Alembic |
| Cache + Queue | Redis 7 + Celery |
| AI (LLM) | Groq `llama-3.3-70b-versatile` (free tier, 14,400 req/day) |
| AI (AVM) | scikit-learn GradientBoostingRegressor |
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS — custom black ops theme |
| Maps | Mapbox GL JS (dynamic import, dark-v11 tiles) |
| Charts | Recharts |
| State | Zustand + TanStack Query |
| Auth | JWT (email/password) + Google OAuth (GIS) |
| Observability | OpenTelemetry + SigNoz (traces, metrics, logs) |
| Mobile | React Native + Expo (iOS/Android) |
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
# Required for property listings (50 free calls/month)
RENTCAST_API_KEY=           # https://app.rentcast.io/

# Required for maps (browser-side)
NEXT_PUBLIC_MAPBOX_TOKEN=   # https://account.mapbox.com/

# Required for mortgage rates
FRED_API_KEY=               # https://fred.stlouisfed.org/docs/api/api_key.html

# Required for neighborhood demographics
CENSUS_API_KEY=             # https://api.census.gov/data/key_signup.html

# Required for crime data
FBI_CRIME_API_KEY=          # https://api.usa.gov/crime/fbi/cde/

# AI deal scoring — free 14,400 req/day (LLaMA 3.3 70B)
GROQ_API_KEY=               # https://console.groq.com/

# Optional — Google OAuth sign-in
# Create at https://console.cloud.google.com → APIs & Services → Credentials
# → OAuth 2.0 Client ID (Web app) → Authorized JS origins: http://localhost:3000
GOOGLE_OAUTH_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=

# Optional — Anthropic Claude fallback if Groq is unavailable
ANTHROPIC_API_KEY=          # https://console.anthropic.com/

# Optional — enriches tax history
ATTOM_API_KEY=              # https://api.attomdata.com/

# Optional — city/ZIP supplemental data
API_NINJAS_KEY=             # https://api-ninjas.com/
```

All keys are optional — adapters degrade gracefully when missing.

### 2. Start the Stack

**With observability (recommended):**
```bash
docker compose -f docker-compose.yml -f docker-compose.signoz.yml up -d --build
```

**Without observability:**
```bash
docker compose up -d --build
```

| Service | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (FastAPI) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| SigNoz Dashboard | http://localhost:3301 (with observability only) |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

> SigNoz takes ~60 seconds to initialize on first boot (ClickHouse startup). Refresh http://localhost:3301 if it shows a blank page.

### 3. Run Migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Train the AVM Model

The ML valuation model needs to be trained once before AVM estimates will work:

```bash
docker compose exec backend python scripts/train_avm.py
# Expected: Test MAPE: ~0.09 | R²: ~0.94
# Creates: backend/models/avm_v1.pkl
```

### 5. Verify

```bash
curl http://localhost:8000/health
# → {"status":"operational","version":"1.0.0","app":"LandGrab"}

curl "http://localhost:8000/api/v1/properties?city=Tulsa&state=OK"
curl http://localhost:8000/api/v1/market/rates/current
```

### 6. Mobile App (Optional)

```bash
cd mobile
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_OTEL_ENDPOINT to your machine's LAN IP
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). The app connects to the backend over your local network — use your machine's LAN IP, not `localhost`.

> If you change any `EXPO_PUBLIC_*` env var, restart Expo with `npx expo start --clear` to bust the bundle cache.

### 7. Stop the Stack

```bash
docker compose down
# or with SigNoz:
docker compose -f docker-compose.yml -f docker-compose.signoz.yml down
```

---

## Project Structure

```
LandGrab/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/
│   │   │   ├── deps.py               # get_db, get_current_user, get_admin_user
│   │   │   └── routes/
│   │   │       ├── auth.py           # register, login, refresh, logout, /auth/google
│   │   │       ├── users.py          # me, saved-properties, saved-searches, usage
│   │   │       ├── properties.py     # search, detail, score, comps, avm, price-history
│   │   │       ├── search.py         # autocomplete
│   │   │       ├── market.py         # rates/current, /{zip}
│   │   │       └── admin.py          # overview, users list, user update
│   │   ├── core/
│   │   │   ├── config.py             # All settings + API keys
│   │   │   ├── database.py           # Async SQLAlchemy engine
│   │   │   ├── redis_client.py       # Cache helpers + TTL constants
│   │   │   └── security.py           # JWT + bcrypt
│   │   ├── models/
│   │   │   ├── user.py               # User (preferences JSONB, google_id), SavedProperty, SavedSearch
│   │   │   ├── property.py           # Property, PriceHistory, TaxHistory
│   │   │   ├── neighborhood.py       # NeighborhoodData
│   │   │   ├── market.py             # MarketData
│   │   │   ├── deal_score.py         # DealScore (12h expiry)
│   │   │   ├── alert.py
│   │   │   └── ml.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── user.py               # UserResponse, AdminUserItem (+ views_used)
│   │   │   └── property.py           # ComparableSale (+ lot_size_acres), all response types
│   │   ├── services/
│   │   │   ├── property_service.py
│   │   │   ├── comps_service.py      # Land-aware similarity scoring
│   │   │   ├── neighborhood_service.py
│   │   │   ├── market_service.py
│   │   │   ├── user_service.py
│   │   │   ├── auth_service.py       # + google_login()
│   │   │   ├── admin_service.py      # + monthly view counts from Redis
│   │   │   ├── usage_service.py      # Free tier view tracking (5/month)
│   │   │   ├── geocoding_service.py
│   │   │   ├── ai/
│   │   │   │   ├── scoring_engine.py
│   │   │   │   ├── claude_analyzer.py    # Groq → Anthropic → None
│   │   │   │   ├── deal_score_service.py
│   │   │   │   └── valuation_model.py    # Loads backend/models/avm_v1.pkl
│   │   │   ├── alerts/email_service.py
│   │   │   └── data_sources/
│   │   │       ├── base.py, registry.py
│   │   │       ├── rentcast_adapter.py   # Search-level Redis cache (24h)
│   │   │       ├── attom_adapter.py
│   │   │       ├── fred_adapter.py
│   │   │       ├── census_adapter.py
│   │   │       ├── fbi_crime_adapter.py
│   │   │       └── http_client.py
│   │   └── tasks/
│   │       ├── celery_app.py, data_sync.py, alerts.py, maintenance.py, ml_training.py
│   ├── alembic/                      # Migrations (run: alembic upgrade head)
│   ├── models/                       # avm_v1.pkl lives here (git-ignored, run train_avm.py)
│   ├── scripts/
│   │   ├── test_apis.py              # Live API diagnostic
│   │   └── train_avm.py              # AVM model training (run once)
│   ├── tests/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Home hero
│   │   │   ├── search/page.tsx       # Split-pane results + map
│   │   │   ├── property/[id]/page.tsx
│   │   │   ├── favorites/page.tsx    # Watchlist
│   │   │   ├── map/page.tsx          # Full-screen map
│   │   │   ├── profile/page.tsx      # Account + preferences + password
│   │   │   ├── admin/page.tsx        # Admin dashboard
│   │   │   └── auth/{login,register}/page.tsx  # Email/password + Google OAuth
│   │   ├── components/
│   │   │   ├── layout/Navbar.tsx
│   │   │   ├── search/SearchBar.tsx, FilterPanel.tsx, PropertyList.tsx
│   │   │   ├── property/
│   │   │   │   ├── PropertyDetailClient.tsx  # Land-aware ($/acre, green acres, propertyType prop)
│   │   │   │   ├── PriceHistoryChart.tsx
│   │   │   │   ├── TaxHistoryPanel.tsx
│   │   │   │   ├── CompsPanel.tsx            # Land: acres + $/acre; non-land: sqft + $/sqft
│   │   │   │   ├── NeighborhoodPanel.tsx
│   │   │   │   ├── CrimePanel.tsx            # FBI crime data (separate from neighborhood)
│   │   │   │   ├── MarketPanel.tsx           # Hides Price/sqft for land
│   │   │   │   ├── InterestRatesPanel.tsx
│   │   │   │   ├── DealScorePanel.tsx
│   │   │   │   └── AVMPanel.tsx
│   │   │   ├── map/PropertyMap.tsx
│   │   │   ├── ui/HudCard.tsx, StatBadge.tsx, DealScoreMeter.tsx, ProGate.tsx
│   │   │   └── providers/QueryProvider.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts         # 401 interceptor syncs Zustand auth state
│   │   │   ├── hooks/useProperty.ts, useSearch.ts, useUsage.ts
│   │   │   └── store/authStore.ts    # isInitialized flag + loginWithGoogle action
│   │   └── __tests__/
│   ├── tailwind.config.ts
│   ├── vitest.config.ts
│   └── package.json
├── mobile/
│   ├── app/
│   │   ├── _layout.tsx               # OTel init, navigation tracing, auth bootstrap
│   │   ├── (tabs)/
│   │   │   ├── search.tsx            # Property search + map toggle + filters
│   │   │   ├── map.tsx               # Full-screen map
│   │   │   └── profile.tsx           # Account + saved properties
│   │   ├── property/[id].tsx         # Property detail
│   │   └── auth/{login,register}.tsx
│   ├── src/
│   │   ├── components/               # PropertyCard, PropertyMapView, etc.
│   │   ├── lib/
│   │   │   ├── api-client.ts         # Axios + OTel request/response interceptors
│   │   │   ├── telemetry.ts          # RNOTLPExporter, initTelemetry, navigation tracing
│   │   │   ├── hooks/
│   │   │   └── store/authStore.ts
│   │   └── types/
│   ├── .env.example
│   ├── .env                          # Never committed
│   └── package.json
├── docker-compose.yml
├── docker-compose.signoz.yml         # SigNoz observability stack (merge to enable)
├── signoz-nginx.conf                 # Custom nginx for SigNoz frontend (DNS resolver fix)
├── otel-collector-config.yaml        # OpenTelemetry Collector config (ClickHouse exporters)
├── .env.example
├── .env                              # Never committed
└── CLAUDE.md
```

---

## API Reference

```
GET  /health

GET  /api/v1/properties                     # Search (city, state, zip, price, beds, type, limit)
GET  /api/v1/properties/{id}                # Full detail + price/tax history
GET  /api/v1/properties/{id}/score          # Deal score (Groq LLM + rule-based, 12h cache)
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
POST /api/v1/auth/google                    # Google OAuth (verifies GIS ID token)

GET        /api/v1/users/me
PATCH      /api/v1/users/me
PUT        /api/v1/users/preferences
PUT        /api/v1/users/password
GET        /api/v1/users/usage
GET|POST   /api/v1/users/saved-properties
DELETE     /api/v1/users/saved-properties/{id}
GET|POST   /api/v1/users/saved-searches
PUT|DELETE /api/v1/users/saved-searches/{id}

GET   /api/v1/admin/overview
GET   /api/v1/admin/users
PATCH /api/v1/admin/users/{id}
```

Full interactive docs at `http://localhost:8000/docs` when the stack is running.

---

## Testing

### Backend — pytest (async, no live connections required)

```bash
docker compose exec backend pip install pytest==8.3.3 pytest-asyncio==0.24.0 httpx==0.27.2
docker compose exec backend python -m pytest tests/ -v
```

| Test File | Coverage |
|---|---|
| `test_health.py` | Health endpoint |
| `test_auth.py` | Register, login, refresh, logout |
| `test_properties.py` | Search, detail, score, comps, AVM, price-history |
| `test_search.py` | Autocomplete |
| `test_users.py` | Profile, saved properties, saved searches |
| `test_market.py` | Mortgage rates, market data |

### Frontend — vitest

```bash
cd frontend && npm test
```

### Live API Diagnostic

```bash
docker compose exec backend python scripts/test_apis.py
```

---

## Data Sources

### Active

| Source | Key | Data |
|---|---|---|
| RentCast | `RENTCAST_API_KEY` | Active listings, property records, price history. 50 calls/month free; search results cached in Redis 24h to protect quota. |
| FRED | `FRED_API_KEY` | 30yr/15yr fixed mortgage rates |
| US Census ACS | `CENSUS_API_KEY` | Demographics, income, population trends |
| FBI Crime API | `FBI_CRIME_API_KEY` | Violent + property crime rates by state |
| API Ninjas | `API_NINJAS_KEY` | City/ZIP supplemental data |
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Dark map tiles + satellite aerial views |
| Groq | `GROQ_API_KEY` | LLaMA 3.3 70B LLM — free, 14,400 req/day |

### Optional / Paid

| Source | Key | Data |
|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | Claude fallback if Groq is absent |
| ATTOM | `ATTOM_API_KEY` | Tax history, property detail (trial plan) |
| Google OAuth | `GOOGLE_OAUTH_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | Sign in with Google |

After adding a key to `.env`, force-recreate to inject it:

```bash
docker compose up -d --force-recreate backend celery_worker celery_beat
# For NEXT_PUBLIC_* keys also recreate frontend:
docker compose up -d --force-recreate backend frontend celery_worker celery_beat
```

---

## AI Deal Scoring

**Layer 1 — Rule-based component scores (deterministic, no API cost):**

| Component | Signal |
|---|---|
| Price vs Comps | How far below/above comparable active listings |
| Market Timing | Months of supply, inventory trend |
| Neighborhood | Crime grade, school rating, walkability |
| Growth Potential | Population trend, permit data |
| Tax Burden | Effective tax rate vs area median |
| Price Trend | YoY price change direction |

**Layer 2 — Groq LLM analysis (30% of final score):**
- Provider: Groq `llama-3.3-70b-versatile` → Anthropic Claude fallback → None (100% rule-based)
- Input: structured property briefing
- Output: `{adjusted_score, grade, verdict, summary, key_factors, risks, opportunities}`
- Final score = rule-based × 0.70 + LLM × 0.30
- Cached in `deal_scores` table for 12 hours per property

---

## Map Marker Colors

| Color | Meaning |
|---|---|
| `#00ff41` neon green | Deal score ≥ 75 — strong deal |
| `#f59e0b` amber | Deal score 50–74 — moderate |
| `#ef4444` red | Deal score < 50 — weak |
| `#00d4ff` cyan | No score yet |
| `#2e7d32` dark green | Land parcel |

---

## Background Tasks (Celery Beat)

| Task | Schedule | Job |
|---|---|---|
| `sync_redfin_weekly` | Monday 3am | Download + parse Redfin sales CSV |
| `check_price_drops` | Every 6h | Alert users when a saved property price drops |
| `check_new_listings` | Every 2h | Alert users when a saved search has new matches |
| `expire_old_scores` | Daily 2am | Clear expired deal scores for recompute |
| `retrain_avm` | Monthly | Retrain GradientBoosting AVM on latest sales data |

---

## Development

### Hot reload
The backend and frontend both hot-reload via Docker volume mounts. Edit files locally — changes reflect immediately.

### After adding API keys
```bash
docker compose up -d --force-recreate backend celery_worker celery_beat
docker compose exec backend python -c "from app.core.config import settings; print(settings.RENTCAST_API_KEY[:4])"
```

### Wipe stale property cache
```bash
docker compose exec db psql -U landgrab -d landgrab -c "DELETE FROM properties;"
```

### Wipe neighborhood cache (forces FBI + Census re-fetch)
```bash
docker compose exec db psql -U landgrab -d landgrab -c "DELETE FROM neighborhood_data;"
```

### Full rebuild
```bash
docker compose down
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/train_avm.py
```

---

## Observability

LandGrab ships with full OpenTelemetry instrumentation, visualized in a self-hosted [SigNoz](https://signoz.io/) instance.

### What's instrumented

| Signal | Coverage |
|---|---|
| **Traces** | Every HTTP request (FastAPI), every SQL query (SQLAlchemy), every Redis command, every outbound HTTP call (all data source adapters via httpx), every Celery task — all with parent→child linking |
| **Metrics** | `landgrab.cache.hits/misses` (Redis), `landgrab.deal_score.duration_ms` (AI computation time), `landgrab.rentcast.api_calls` (quota tracking), standard FastAPI request metrics |
| **Logs** | Structured Python logs, correlated with trace IDs, forwarded to SigNoz Logs via OTLP |

### Starting with SigNoz

```bash
docker compose -f docker-compose.yml -f docker-compose.signoz.yml up -d --build
```

Open **http://localhost:3301** — navigate to Services to see `landgrab-backend`, `landgrab-frontend`, `landgrab-worker`, and `landgrab-mobile` (once the mobile app connects).

Telemetry is **disabled by default** when running without the signoz compose file — no latency penalty.

#### SigNoz first-run notes

- Allow ~60s for ClickHouse to initialize on first boot before the UI is usable.
- Session survives container restarts because `SIGNOZ_JWT_SECRET` is set in `docker-compose.signoz.yml`.
- The custom `signoz-nginx.conf` is volume-mounted into the SigNoz frontend container. It adds `resolver 127.0.0.11 valid=10s` so nginx re-resolves the `signoz-query-service` hostname at request time instead of caching the DNS entry at startup (which causes 404/502 errors after a `docker compose restart`).

---

## Roadmap

- [x] Phase 1 — Docker infrastructure + database schema
- [x] Phase 2 — Data source adapters (FRED, Census, RentCast, FBI Crime, API Ninjas)
- [x] Phase 3 — Frontend shell + Mapbox map (color-coded markers, search history, watchlist)
- [x] Phase 4 — Property detail page (photos, price/tax history, comps, neighborhood, market, rates)
- [x] Phase 5 — AI deal scoring (LLM + rule-based blend, animated gauge, score colors on map)
- [x] Phase 6 — Auth + saved properties + email alerts + profile page
- [x] Phase 7 — AVM model training (GradientBoosting, synthetic data pipeline)
- [x] Phase 8 — Google OAuth + free tier + admin dashboard + land-aware property detail
- [x] Phase 9 — Full-stack observability (SigNoz: traces, metrics, logs via OpenTelemetry)
- [x] Phase 10 — Mobile app (React Native / Expo: search, map, property detail, auth, OTel tracing)
- [ ] Phase 11 — ATTOM full integration (paid data tier)

---

## License

MIT
