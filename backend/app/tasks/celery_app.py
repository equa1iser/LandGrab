from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

app = Celery(
    "landgrab",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.data_sync",
        "app.tasks.alerts",
        "app.tasks.maintenance",
    ],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "sync-redfin-weekly": {
            "task": "app.tasks.data_sync.sync_redfin_weekly",
            "schedule": crontab(hour=3, minute=0, day_of_week=1),
        },
        "check-price-drops": {
            "task": "app.tasks.alerts.check_price_drops",
            "schedule": crontab(minute=0, hour="*/6"),
        },
        "check-new-listings": {
            "task": "app.tasks.alerts.check_new_listings",
            "schedule": crontab(minute=0, hour="*/2"),
        },
        "expire-deal-scores": {
            "task": "app.tasks.maintenance.expire_old_scores",
            "schedule": crontab(hour=2, minute=0),
        },
    },
)
