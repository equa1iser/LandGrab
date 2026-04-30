# LandGrab — Setup & Getting Started

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running)
- [Node.js 20+](https://nodejs.org/) (for local frontend dev)
- [Git](https://git-scm.com/)

## 1. Configure API Keys

Copy `.env.example` to `.env` (already done) and fill in your keys:

```bash
# Required for any functionality:
FRED_API_KEY=          # https://fred.stlouisfed.org/docs/api/api_key.html
CENSUS_API_KEY=        # https://api.census.gov/data/key_signup.html

# Required for property listings (pick one):
RENTCAST_API_KEY=      # https://app.rentcast.io/ (50 calls/month free)

# Required for maps:
NEXT_PUBLIC_MAPBOX_TOKEN=  # https://account.mapbox.com/ (free tier)

# Required for AI deal scoring:
ANTHROPIC_API_KEY=     # https://console.anthropic.com/
```

All other keys are optional and adapters degrade gracefully without them.

## 2. Start the Stack

```bash
# Make sure Docker Desktop is running first, then:
docker compose up --build
```

This starts:
| Service | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (FastAPI) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## 3. Run Database Migrations

In a new terminal, after the stack is up:

```bash
docker compose exec backend alembic upgrade head
```

## 4. Verify It's Working

```bash
curl http://localhost:8000/health
# → {"status":"operational","version":"1.0.0","app":"LandGrab"}

# Search for properties (example):
curl "http://localhost:8000/api/v1/properties?city=Austin&state=TX"

# Get current mortgage rates:
curl http://localhost:8000/api/v1/market/rates/current
```

## 5. Populate Market Data (optional first run)

Run the Redfin weekly sync manually to populate market data:

```bash
docker compose exec celery_worker celery -A app.tasks.celery_app call app.tasks.data_sync.sync_redfin_weekly
```

## Development

### Backend only (hot reload built in via Docker volume mount)
```bash
docker compose up db redis backend
```

### Frontend locally (faster HMR)
```bash
cd frontend
npm install
npm run dev
```

### Run a specific Celery task manually
```bash
docker compose exec celery_worker celery -A app.tasks.celery_app call app.tasks.maintenance.expire_old_scores
```

## When You Get API Keys

1. Edit `.env` with your keys
2. `docker compose restart backend celery_worker celery_beat`
3. No code changes needed — adapters auto-activate when keys are present

## Adding ATTOM Data (when ready)

Add `ATTOM_API_KEY=your_key` to `.env` and restart. ATTOM automatically takes priority over
RentCast in the `DataSourceRegistry` due to its higher priority score. No other changes needed.
