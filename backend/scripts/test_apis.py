"""
API Connectivity Diagnostic — run inside the backend container:
  docker compose exec backend python scripts/test_apis.py

Prints a pass/fail result for every configured external API, plus a
sample of the data returned so you can verify the shape is correct.
"""

import asyncio
import sys

sys.path.insert(0, "/app")

import httpx
from app.core.config import settings

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


def ok(label: str, detail: str = ""):
    print(f"  {GREEN}✓ PASS{RESET}  {label}" + (f"  — {detail}" if detail else ""))


def fail(label: str, detail: str = ""):
    print(f"  {RED}✗ FAIL{RESET}  {label}" + (f"  — {detail}" if detail else ""))


def skip(label: str, reason: str = "key not configured"):
    print(f"  {YELLOW}– SKIP{RESET}  {label}  ({reason})")


def section(title: str):
    print(f"\n{BOLD}{title}{RESET}")
    print("─" * 52)


# ── RentCast ─────────────────────────────────────────────────────────────────

async def test_rentcast():
    section("RentCast  (property listings + market stats)")
    if not settings.RENTCAST_API_KEY:
        skip("listings/sale"); skip("properties fallback"); skip("statistics/sale"); return

    headers = {"X-Api-Key": settings.RENTCAST_API_KEY}
    async with httpx.AsyncClient(base_url="https://api.rentcast.io/v1",
                                 headers=headers, timeout=15) as client:
        try:
            r = await client.get("/listings/sale",
                                 params={"city": "Austin", "state": "TX", "limit": 2, "status": "Active"})
            if r.status_code == 200:
                data = r.json()
                price = data[0].get("price") if data else None
                ok("listings/sale",
                   f"{len(data)} listing(s), first price=${price:,}" if price else f"{len(data)} listing(s) (no price field)")
            else:
                fail("listings/sale", f"HTTP {r.status_code}: {r.text[:120]}")
        except Exception as e:
            fail("listings/sale", str(e))

        try:
            r2 = await client.get("/properties",
                                  params={"city": "Austin", "state": "TX", "limit": 2})
            if r2.status_code == 200:
                ok("properties (fallback)", f"{len(r2.json())} record(s)")
            else:
                fail("properties (fallback)", f"HTTP {r2.status_code}")
        except Exception as e:
            fail("properties (fallback)", str(e))

        try:
            r3 = await client.get("/markets", params={"zipCode": "78701"})
            if r3.status_code == 200:
                sale = r3.json().get("saleData", {})
                median = sale.get("medianPrice")
                dom = sale.get("medianDaysOnMarket")
                ok("markets (ZIP stats)",
                   f"median=${median:,}, DOM={dom}d" if median else f"keys: {list(sale.keys())[:6]}")
            else:
                fail("markets (ZIP stats)", f"HTTP {r3.status_code}: {r3.text[:120]}")
        except Exception as e:
            fail("markets (ZIP stats)", str(e))


# ── FRED ─────────────────────────────────────────────────────────────────────

async def test_fred():
    section("FRED  (Federal Reserve economic data)")
    if not settings.FRED_API_KEY:
        skip("series/observations"); return

    try:
        async with httpx.AsyncClient(base_url="https://api.stlouisfed.org/fred",
                                     timeout=15) as client:
            r = await client.get("/series/observations", params={
                "series_id": "MORTGAGE30US",
                "api_key": settings.FRED_API_KEY,
                "file_type": "json",
                "limit": 1,
                "sort_order": "desc",
            })
            if r.status_code == 200:
                obs = r.json().get("observations", [])
                val = obs[0].get("value") if obs else None
                ok("30yr mortgage rate", f"latest = {val}%")
            else:
                fail("series/observations", f"HTTP {r.status_code}: {r.text[:120]}")
    except Exception as e:
        fail("FRED", str(e))


# ── Census ───────────────────────────────────────────────────────────────────

async def test_census():
    section("Census Bureau  (demographic / ACS5)")
    if not settings.CENSUS_API_KEY:
        skip("ACS5 median income"); return

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get("https://api.census.gov/data/2022/acs/acs5", params={
                "get": "B19013_001E",
                "for": "zip code tabulation area:78701",
                "key": settings.CENSUS_API_KEY,
            })
            if r.status_code == 200:
                rows = r.json()
                income = rows[1][0] if len(rows) > 1 else None
                ok("ACS5 median income",
                   f"ZIP 78701 → ${int(income):,}" if income and income != "-666666666"
                   else "no data for this ZIP")
            else:
                fail("ACS5", f"HTTP {r.status_code}: {r.text[:120]}")
    except Exception as e:
        fail("Census", str(e))


# ── ATTOM ────────────────────────────────────────────────────────────────────

async def test_attom():
    section("ATTOM  (property snapshot + detail)")
    if not settings.ATTOM_API_KEY:
        skip("property/snapshot lat/lng"); skip("property/detail"); return

    headers = {"apikey": settings.ATTOM_API_KEY, "Accept": "application/json"}
    async with httpx.AsyncClient(
        base_url="https://api.gateway.attomdata.com/propertyapi/v1.0.0",
        headers=headers, timeout=15,
    ) as client:
        # Test snapshot by lat/lng (matches docs example)
        try:
            r = await client.get("/property/snapshot",
                                 params={"latitude": 39.7047, "longitude": -105.0814,
                                         "radius": 2, "pagesize": 2})
            if r.status_code == 200:
                props = r.json().get("property", [])
                first_addr = props[0].get("address", {}).get("line1") if props else None
                ok("property/snapshot (lat/lng)",
                   f"{len(props)} result(s)" + (f", first: {first_addr}" if first_addr else ""))
            elif r.status_code == 404:
                fail("property/snapshot (lat/lng)",
                     "HTTP 404 — no results or trial plan restriction")
            else:
                fail("property/snapshot (lat/lng)", f"HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            fail("property/snapshot (lat/lng)", str(e))

        # Test property/detail by address (address1 + address2 city/state)
        try:
            r2 = await client.get("/property/detail",
                                  params={"address1": "650 S Wadsworth Blvd", "address2": "Lakewood CO"})
            body = r2.json()
            status_msg = body.get("status", {}).get("msg", "")
            if r2.status_code == 200:
                props = body.get("property", [])
                addr = props[0].get("address", {}).get("line1") if props else None
                ok("property/detail", f"address: {addr}" if addr else "returned data")
            elif status_msg == "SuccessWithoutResult":
                ok("property/detail", "API connected — address not in DB (trial plan may limit coverage)")
            else:
                fail("property/detail", f"HTTP {r2.status_code}: {r2.text[:200]}")
        except Exception as e:
            fail("property/detail", str(e))


# ── FBI Crime ────────────────────────────────────────────────────────────────

async def test_fbi_crime():
    section("FBI Crime Data Explorer")
    if not settings.FBI_CRIME_API_KEY:
        skip("agency lookup", "FBI_CRIME_API_KEY not configured"); return

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://api.usa.gov/crime/fbi/cde/agency/byStateAbbr/TX",
                params={"API_KEY": settings.FBI_CRIME_API_KEY},
            )
            if r.status_code == 200:
                agencies = r.json()
                count = len(agencies) if isinstance(agencies, list) else "?"
                ok("agency/byStateAbbr", f"{count} TX agencies returned")
            else:
                fail("agency/byStateAbbr", f"HTTP {r.status_code}: {r.text[:120]}")
    except Exception as e:
        fail("FBI Crime", str(e))


# ── API Ninjas ───────────────────────────────────────────────────────────────

async def test_api_ninjas():
    section("API Ninjas")
    if not settings.API_NINJAS_KEY:
        skip("city lookup"); return

    try:
        async with httpx.AsyncClient(
            base_url="https://api.api-ninjas.com/v1",
            headers={"X-Api-Key": settings.API_NINJAS_KEY},
            timeout=15,
        ) as client:
            r = await client.get("/city", params={"name": "Austin", "country": "US"})
            if r.status_code == 200:
                cities = r.json()
                pop = cities[0].get("population") if cities else None
                ok("city lookup",
                   f"Austin, TX — pop. {pop:,}" if pop else f"{len(cities)} result(s)")
            else:
                fail("city lookup", f"HTTP {r.status_code}: {r.text[:120]}")
    except Exception as e:
        fail("API Ninjas", str(e))


# ── Anthropic ────────────────────────────────────────────────────────────────

async def test_anthropic():
    section("Anthropic  (AI deal scoring)")
    if not settings.ANTHROPIC_API_KEY:
        skip("messages.create"); return

    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            messages=[{"role": "user", "content": "Reply with the word READY only."}],
        )
        reply = msg.content[0].text.strip() if msg.content else ""
        ok("messages.create", f"response: {reply!r}")
    except Exception as e:
        fail("Anthropic", str(e))


# ── Mapbox ───────────────────────────────────────────────────────────────────

async def test_mapbox():
    section("Mapbox  (interactive map tile token)")
    token = settings.NEXT_PUBLIC_MAPBOX_TOKEN
    if not token:
        skip("token validation"); return

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"https://api.mapbox.com/tokens/v2?access_token={token}")
            if r.status_code == 200:
                ok("token valid", f"type: {r.json().get('token', {}).get('usage', 'pk')}")
            elif r.status_code == 401:
                fail("token invalid", "401 Unauthorized — check NEXT_PUBLIC_MAPBOX_TOKEN")
            else:
                fail("token check", f"HTTP {r.status_code}")
    except Exception as e:
        fail("Mapbox", str(e))


# ── Main ─────────────────────────────────────────────────────────────────────

async def main():
    print(f"\n{BOLD}╔════════════════════════════════════════════════════╗{RESET}")
    print(f"{BOLD}║       LandGrab API Diagnostic                      ║{RESET}")
    print(f"{BOLD}╚════════════════════════════════════════════════════╝{RESET}")

    await test_rentcast()
    await test_fred()
    await test_census()
    await test_attom()
    await test_fbi_crime()
    await test_api_ninjas()
    await test_anthropic()
    await test_mapbox()

    print(f"\n{'─'*52}")
    print("Done.\n")


if __name__ == "__main__":
    asyncio.run(main())
