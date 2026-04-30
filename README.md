# ■ LANDGRAB

**Real estate buyer intelligence platform.** LandGrab aggregates property data, AI deal scoring, neighborhood analytics, and live mortgage rates into one tactical dashboard so buyers can instantly judge whether a property is a deal.

> Dark, data-dense, no fluff. Think Bloomberg terminal for house hunting.

---

## Features

- **AI Deal Scoring** — Claude-powered analysis blended with rule-based component scores (comps, market timing, neighborhood, growth, tax burden, price trend). Every property gets a 0–100 score, letter grade (A–F), and a plain-English verdict.
- **LandGrab Estimate (AVM)** — GradientBoosting ML model trained on local Redfin sales data. Shows estimated value vs list price with confidence range.
- **Interactive Map** — Mapbox dark tiles with property pins color-coded by deal score. Heatmap overlay for price density.
- **Price & Tax History** — Full historical charts with trend indicators.
- **Comparable Sales** — Haversine-filtered, similarity-ranked recent sales in the area.
- **Neighborhood Intel** — Crime index, school ratings, walk/transit/bike scores, Census demographic trends.
- **Live Mortgage Rates** — FRED API rates with built-in payment calculator (adjust down payment %, loan term).
- **Saved Properties & Alerts** — Bookmark properties, set search criteria, get email alerts on price drops and new listings.
- **Pluggable Data Sources** — All adapters implement `BaseDataSource`. Paid sources (ATTOM, GreatSchools, Walk Score) slot in with no route changes.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend API | Python 3.12 + FastAPI (async) |
| Database | PostgreSQL 15 + SQLAlchemy (async) + Alembic |
| Cache + Queue | Redis 7 + Celery |
| AI | Claude API (`claude-sonnet-4-6`) + scikit-learn |
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS — custom black ops theme |
| Maps | Mapbox GL JS + react-map-gl |
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
# Required for core functionality
FRED_API_KEY=           # https://fred.stlouisfed.org/docs/api/api_key.html
CENSUS_API_KEY=         # https://api.census.gov/data/key_signup.html

# Required for property listings
RENTCAST_API_KEY=       # https://app.rentcast.io/ (50 free calls/month)

# Required for maps
NEXT_PUBLIC_MAPBOX_TOKEN=   # https://account.mapbox.com/ (free tier)

# Required for AI deal scoring
ANTHROPIC_API_KEY=      # https://console.anthropic.com/
```

All keys are optional — adapters degrade gracefully when missing.

### 2. Start the Stack

```bash
docker compose up --build
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

curl "http://localhost:8000/api/v1/properties?city=Austin&state=TX"
curl http://localhost:8000/api/v1/market/rates/current
```

---

## Project Structure

```
LandGrab/
├── backend/
│   ├── app/
│   │   ├── api/v1/routes/        # properties, search, auth, users, market
│   │   ├── core/                 # config, database, redis, security (JWT + bcrypt)
│   │   ├── models/               # SQLAlchemy: user, property, neighborhood, market,
│   │   │                         #   deal_score, alert, ml (model metrics)
│   │   ├── schemas/              # Pydantic v2 request/response shapes
│   │   ├── services/
│   │   │   ├── data_sources/     # BaseDataSource + DataSourceRegistry + adapters
│   │   │   │   ├── fred.py       # Mortgage rates from Federal Reserve
│   │   │   │   ├── census.py     # Demographics from ACS
│   │   │   │   ├── rentcast.py   # Property data (50 free calls/month)
│   │   │   │   ├── redfin.py     # Weekly CSV bulk download (sales history)
│   │   │   │   ├── fhfa.py       # Regional price index (quarterly CSV)
│   │   │   │   ├── fbi_crime.py  # Crime index by city
│   │   │   │   └── attom.py      # ATTOM stub (plug in key to activate)
│   │   │   ├── ai/
│   │   │   │   ├── scoring_engine.py   # 6-component rule-based score
│   │   │   │   ├── claude_analyzer.py  # Claude API with prompt caching
│   │   │   │   ├── deal_score_service.py  # 70/30 blend, 12h DB cache
│   │   │   │   └── valuation_model.py  # GradientBoosting AVM
│   │   │   ├── property_service.py     # Main orchestration (asyncio.gather)
│   │   │   ├── neighborhood_service.py
│   │   │   ├── market_service.py
│   │   │   ├── comps_service.py        # Haversine filter + similarity ranking
│   │   │   └── user_service.py
│   │   └── tasks/                # Celery beat tasks
│   │       ├── data_sync.py      # Redfin CSV weekly sync
│   │       ├── alerts.py         # Price drop + new listing alerts
│   │       ├── ml_training.py    # Monthly AVM retrain
│   │       └── maintenance.py    # Expire old deal scores
│   ├── alembic/                  # Database migrations
│   ├── tests/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── page.tsx          # Home — hero search
│   │   │   ├── search/           # Split-pane results (list + map)
│   │   │   ├── property/[id]/    # Full property detail
│   │   │   ├── map/              # Full-screen map view
│   │   │   ├── dashboard/        # Saved properties + searches
│   │   │   └── auth/             # Login + register
│   │   ├── components/
│   │   │   ├── map/              # PropertyMap, PropertyMarkers, PriceHeatmap
│   │   │   ├── property/         # All detail panels (price history, comps,
│   │   │   │                     #   neighborhood, market, rates, AVM, deal score)
│   │   │   ├── search/           # SearchBar, FilterPanel
│   │   │   └── ui/               # HudCard, StatBadge, DealScoreMeter
│   │   └── lib/
│   │       ├── api-client.ts     # Typed fetch wrapper
│   │       ├── hooks/            # TanStack Query hooks
│   │       └── store/            # Zustand stores (auth, search)
│   ├── tailwind.config.ts        # Black ops color palette + custom fonts
│   └── package.json
├── docker-compose.yml
├── .env.example
└── SETUP.md                      # Detailed setup guide
```

---

## API Reference

```
GET  /api/v1/search?q=&type=city|zip|address&filters=...
GET  /api/v1/search/autocomplete?q=
GET  /api/v1/properties/{id}                  # Full detail
GET  /api/v1/properties/{id}/score            # Claude AI deal score (12h cache)
GET  /api/v1/properties/{id}/comps            # Comparable recent sales
GET  /api/v1/properties/{id}/price-history
GET  /api/v1/properties/{id}/avm              # ML valuation estimate
GET  /api/v1/market/{zip}                     # Area market stats
GET  /api/v1/market/rates/current             # FRED live mortgage rates
POST /api/v1/auth/register
POST /api/v1/auth/login
GET|POST|DELETE /api/v1/users/saved-properties
GET|POST|PUT|DELETE /api/v1/users/saved-searches
```

Full interactive docs at `http://localhost:8000/docs` when the stack is running.

---

## Data Sources

### Free (active in MVP)

| Source | Data | Notes |
|---|---|---|
| FRED API | 30yr/15yr mortgage rates | Free key, high rate limits |
| US Census ACS | Demographics, income, population | Free key |
| FHFA HPI | Regional price trend history | Quarterly CSV |
| FBI Crime API | Crime index by city | Free REST API |
| RentCast API | Property details + AVM | 50 calls/month free |
| Redfin Data Center | Weekly sales CSV | Free bulk download |

### Paid (plug-and-play when ready)

| Source | Data | Cost |
|---|---|---|
| ATTOM Data | Listings, tax, ownership, 9000+ fields | $95/mo trial |
| GreatSchools | School ratings | Freemium |
| Walk Score | Walk/transit/bike scores | Paid |

Add `ATTOM_API_KEY=your_key` to `.env` and restart — ATTOM auto-activates at higher priority via `DataSourceRegistry`. No code changes needed.

---

## AI Deal Scoring

Two-layer approach to balance cost and quality:

**Layer 1 — Rule-based component scores (deterministic, no API cost):**

| Component | Weight | Signal |
|---|---|---|
| Price vs Comps | 35% | How far below/above comparable recent sales |
| Market Timing | 20% | Months of supply, inventory trend |
| Neighborhood | 20% | Crime grade, school rating, walkability |
| Growth Potential | 15% | Population trend, permit data |
| Tax Burden | 5% | Effective tax rate vs area median |
| Price Trend | 5% | YoY price change direction |

**Layer 2 — Claude analysis (30% of final score):**
- Input: structured property briefing formatted as prose
- Output: `{adjusted_score, grade, verdict, summary, key_factors, risks, opportunities}`
- System prompt uses Anthropic prompt caching (ephemeral) to reduce token cost
- Final score = rule-based × 0.70 + Claude × 0.30
- Cached in database 12 hours per property

---

## Background Tasks (Celery Beat)

| Task | Schedule | Job |
|---|---|---|
| `sync_redfin_weekly` | Monday 3am | Download + parse Redfin sales CSV |
| `check_price_drops` | Every 6h | Alert users when saved property drops |
| `check_new_listings` | Every 2h | Alert users when saved search has new matches |
| `expire_old_scores` | Daily 2am | Clear expired deal scores for recompute |
| `retrain_avm` | Monthly | Retrain GradientBoosting AVM on latest sales data |

Run tasks manually during development:

```bash
docker compose exec celery_worker celery -A app.tasks.celery_app call app.tasks.data_sync.sync_redfin_weekly
docker compose exec celery_worker celery -A app.tasks.celery_app call app.tasks.maintenance.expire_old_scores
```

---

## Development

### Backend only (hot reload via Docker volume mount)
```bash
docker compose up db redis backend
```

### Frontend locally (faster HMR)
```bash
cd frontend
npm install
npm run dev
```

### When you add API keys
```bash
# Edit .env, then:
docker compose restart backend celery_worker celery_beat
# No code changes needed
```

---

## Roadmap

- [x] Phase 1 — Docker infrastructure + database schema
- [x] Phase 2 — Data source adapters (FRED, Census, RentCast, Redfin, FBI Crime)
- [x] Phase 3 — Frontend shell + Mapbox map
- [x] Phase 4 — Property detail page (all panels)
- [x] Phase 5 — AI deal scoring (Claude + rule-based blend)
- [x] Phase 6 — Auth + saved properties + email alerts
- [ ] Phase 7 — ML valuation model (AVM training pipeline)
- [ ] Phase 8 — Mobile app (React Native)
- [ ] Phase 9 — ATTOM integration (paid data tier)

---

## License

MIT
