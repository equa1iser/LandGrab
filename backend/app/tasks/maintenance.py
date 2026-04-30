from app.tasks.celery_app import app


@app.task(name="app.tasks.maintenance.expire_old_scores")
def expire_old_scores():
    """Delete expired deal scores so they get recomputed on next request."""
    import asyncio
    from datetime import datetime
    from app.core.database import AsyncSessionLocal
    from app.models.deal_score import DealScore
    from sqlalchemy import delete

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                delete(DealScore).where(
                    DealScore.expires_at < datetime.utcnow(),
                    DealScore.expires_at.isnot(None),
                )
            )
            await db.commit()
            return {"deleted": result.rowcount}

    return asyncio.run(_run())
