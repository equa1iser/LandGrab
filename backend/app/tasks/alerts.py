from app.tasks.celery_app import app


@app.task(name="app.tasks.alerts.check_price_drops")
def check_price_drops():
    """Check saved properties for price drops and notify users."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.models.alert import SavedProperty
    from app.models.property import Property
    from sqlalchemy import select

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(SavedProperty, Property)
                .join(Property, Property.id == SavedProperty.property_id)
                .where(SavedProperty.alert_enabled == True)
            )
            rows = result.all()

            for sp, prop in rows:
                if not sp.price_snapshot or not prop.current_price:
                    continue
                current = float(prop.current_price)
                snapshot = float(sp.price_snapshot)
                drop_pct = (snapshot - current) / snapshot * 100

                if drop_pct >= 2.0:
                    send_price_drop_alert.delay(
                        user_id=str(sp.user_id),
                        address=prop.address_line1,
                        city=prop.city,
                        state=prop.state,
                        old_price=snapshot,
                        new_price=current,
                        drop_pct=round(drop_pct, 1),
                    )
                    sp.price_snapshot = current

            await db.commit()

    asyncio.run(_run())


@app.task(name="app.tasks.alerts.check_new_listings")
def check_new_listings():
    """Check saved searches for new properties and notify users."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.models.alert import SavedSearch
    from sqlalchemy import select

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(SavedSearch).where(SavedSearch.alert_enabled == True)
            )
            searches = result.scalars().all()
            # Placeholder: property search + diff against snapshot
            # Full implementation in Phase 6
            _ = searches

    asyncio.run(_run())


@app.task(name="app.tasks.alerts.send_price_drop_alert")
def send_price_drop_alert(user_id: str, address: str, city: str, state: str,
                           old_price: float, new_price: float, drop_pct: float):
    """Send price drop email alert to user."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from sqlalchemy import select
    import uuid

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.id == uuid.UUID(user_id))
            )
            user = result.scalar_one_or_none()
            if not user:
                return

            subject = f"Price Drop Alert: {address}, {city}, {state}"
            body = (
                f"Good news! A property you saved has dropped in price.\n\n"
                f"Property: {address}, {city}, {state}\n"
                f"Previous Price: ${old_price:,.0f}\n"
                f"New Price: ${new_price:,.0f}\n"
                f"Drop: {drop_pct}%\n\n"
                f"Log in to LandGrab to see the updated deal score.\n"
            )

            from app.services.alerts.email_service import send_email
            await send_email(to_email=user.email, subject=subject, body=body)

    asyncio.run(_run())
