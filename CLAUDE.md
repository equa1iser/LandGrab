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
- **Data sources:** Pluggable `BaseDataSource` adapters — FRED, Census, RentCast, Redfin, FBI Crime; ATTOM slots in via `DataSourceRegistry` when key is present

## Code Style

- No unnecessary comments — only add one when the WHY is non-obvious
- No docstrings unless a function's contract is genuinely surprising
- Prefer editing existing files over creating new ones
- Don't add abstractions beyond what the task requires
