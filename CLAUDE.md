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

Examples:
```
feat: add price history chart with Recharts area overlay
fix: resolve MarketSummary validation error on dict market data
chore: add Redfin CSV weekly sync Celery task
feat: wire AVMPanel to /properties/{id}/avm endpoint
```

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

LandGrab is a real estate buyer intelligence platform. Full context in the plan file and `README.md`. Key facts:

- **Backend:** FastAPI + PostgreSQL + Celery + Redis (Docker Compose)
- **Frontend:** Next.js 14 App Router + Tailwind black ops theme
- **AI:** Claude `claude-sonnet-4-6` for deal scoring (70/30 blend with rule-based engine)
- **Maps:** Mapbox GL JS with dark tiles
- **Data sources:** Pluggable `BaseDataSource` adapters — FRED, Census, RentCast, FBI Crime, API Ninjas; ATTOM slots in via `DataSourceRegistry` when key is present

---

## Infrastructure & Docker

All services run via Docker Compose. The stack:

| Service | Port | Notes |
|---|---|---|
| `backend` | 8000 | FastAPI + uvicorn, hot-reload via volume mount |
| `frontend` | 3000 | Next.js dev server, hot-reload via volume mount |
| `db` | 5432 | PostgreSQL 16 |
| `redis` | 6379 | Cache + Celery broker |
| `celery_worker` | — | Background task processor |
| `celery_beat` | — | Scheduled task scheduler |

### Starting the stack

```bash
docker compose up -d
```

### Adding or changing .env API keys

`docker compose restart` does NOT re-inject `.env` variables — it restarts existing containers as-is. To pick up new or changed keys you must **force-recreate**:

```bash
docker compose up -d --force-recreate backend celery_worker celery_beat
```

Do this every time a key is added to `.env`. Verify keys loaded correctly:

```bash
docker compose exec backend python -c "from app.core.config import settings; print(settings.RENTCAST_API_KEY[:4])"
```

### Running the API diagnostic

A script that tests every configured external API and reports pass/fail with sample data:

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
| `FRED_API_KEY` | Federal Reserve FRED | Active — mortgage rates, economic series |
| `CENSUS_API_KEY` | Census Bureau ACS5 | Active — demographic / income data |
| `ATTOM_API_KEY` | ATTOM Data | Configured — trial plan may restrict endpoints |
| `API_NINJAS_KEY` | API Ninjas | Active — city / ZIP supplemental data |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox | Active — map tile token (browser-side) |
| `ANTHROPIC_API_KEY` | Anthropic | Not yet configured |
| `FBI_CRIME_API_KEY` | FBI CDE | Not yet configured; base URL: `https://api.usa.gov/crime/fbi/cde/` |

### RentCast search behaviour

`search_properties` now uses `/listings/sale` (active listings with asking prices) and falls back to `/properties` (property records, no price). The monthly quota is capped at 50 calls tracked in Redis (`rentcast:monthly_calls`).

---

## Known Architecture Decisions & Bug History

### SQLAlchemy async relationships
Always use `selectinload()` when a query result will access relationships (`price_history`, `tax_history`, `deal_scores`) outside the initial `await`. Accessing a lazy relation outside an async context raises `MissingGreenlet`. Pattern:

```python
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(Property)
    .options(selectinload(Property.price_history), selectinload(Property.tax_history))
    .where(Property.id == uid)
)
```

### DB upserts must commit, not just flush
`_upsert_property` (and any write that must survive the request) must call `await db.commit()` + `await db.refresh(obj)`. Using only `flush()` means data is visible within the session but rolls back when the request ends.

### Decimal schema fields serialize as strings
SQLAlchemy `Numeric`/`Decimal` columns serialize as JSON strings in Pydantic v2. Any schema field that the frontend or Mapbox will use as a number must be typed `float` in the Pydantic schema, not `Decimal`. Affected fields: `lat`, `lng`, `current_price`, `baths`, `lot_size_acres`.

### Mapbox marker race condition
`PropertyMap` initializes the map asynchronously (dynamic import + `new Map()`). The marker effect must depend on a `mapReady` state that is set in the map's `load` event, not just on `properties`. Without this, properties that arrive before the map is ready are silently dropped.

### passlib + bcrypt compatibility
`passlib[bcrypt]==1.7.4` is incompatible with `bcrypt>=4.0.0`. Pin `bcrypt<4.0.0` in `backend/requirements.txt`. bcrypt 4+ raises `ValueError` for passwords >72 bytes during passlib's internal `detect_wrap_bug` check, crashing every auth request.

### Property DB cache staleness
`PropertyService.search()` returns cached DB rows if any exist for the query. If cached rows have stale/null data (e.g., from a previous adapter version), clear them manually:

```bash
docker compose exec db psql -U landgrab -d landgrab -c "DELETE FROM properties;"
```

The next search re-fetches from the external source and re-populates with fresh data.

---

## Testing

### Backend — pytest

```bash
# Install test deps inside the container (not in requirements.txt to keep image lean)
docker compose exec backend pip install pytest==8.3.3 pytest-asyncio==0.24.0 httpx==0.27.2

# Run all tests
docker compose exec backend python -m pytest tests/ -v
```

Config lives in `backend/pytest.ini`. All tests mock the DB and external services — no live connections required.

### Frontend — vitest

```bash
cd frontend && npm test          # single run
cd frontend && npm run test:watch  # watch mode
```

Tests live in `frontend/src/__tests__/`. Components that use `next/navigation` or Zustand stores are mocked at the test module level.

---

## Code Style

- No unnecessary comments — only add one when the WHY is non-obvious
- No docstrings unless a function's contract is genuinely surprising
- Prefer editing existing files over creating new ones
- Don't add abstractions beyond what the task requires
