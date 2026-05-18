import io
import csv
from datetime import datetime, timedelta
from app.tasks.celery_app import app


@app.task(name="app.tasks.data_sync.sync_redfin_weekly", bind=True, max_retries=3)
def sync_redfin_weekly(self):
    """
    Downloads Redfin weekly housing market data CSV and stores in market_data table.
    Runs every Monday at 3am UTC.
    """
    import httpx
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.models.market import MarketData
    from sqlalchemy import select

    REDFIN_CITY_CSV = (
        "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/"
        "zip_code_market_tracker.tsv000.gz"
    )

    async def _run():
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.get(REDFIN_CITY_CSV)
                resp.raise_for_status()

            import gzip
            content = gzip.decompress(resp.content).decode("utf-8")
            reader = csv.DictReader(io.StringIO(content), delimiter="\t")

            async with AsyncSessionLocal() as db:
                count = 0
                for row in reader:
                    zip_code = row.get("region", "").replace("Zip Code: ", "").strip()
                    if not zip_code or len(zip_code) != 5:
                        continue

                    result = await db.execute(
                        select(MarketData).where(MarketData.geo_key == zip_code)
                    )
                    record = result.scalar_one_or_none()
                    if not record:
                        record = MarketData(geo_key=zip_code)
                        db.add(record)

                    def safe_float(val):
                        try:
                            return float(val) if val and val != "" else None
                        except (ValueError, TypeError):
                            return None

                    record.median_price = safe_float(row.get("median_sale_price"))
                    record.price_per_sqft = safe_float(row.get("median_sale_ppsf"))
                    record.median_days_on_market = safe_float(row.get("median_dom"))
                    record.months_of_supply = safe_float(row.get("months_of_supply"))
                    record.yoy_price_change_pct = safe_float(row.get("median_sale_price_yoy"))
                    record.fetched_at = datetime.utcnow()
                    record.expires_at = datetime.utcnow() + timedelta(days=7)

                    count += 1
                    if count % 1000 == 0:
                        await db.commit()

                await db.commit()
            return {"status": "success", "records_updated": count}

        except Exception as exc:
            raise self.retry(exc=exc, countdown=3600)

    return asyncio.run(_run())
