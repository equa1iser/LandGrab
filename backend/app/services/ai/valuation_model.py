import os
import uuid
from typing import Optional
from dataclasses import dataclass

MODEL_PATH = "/app/models/avm_v1.pkl"
FEATURE_COLUMNS = [
    "sqft", "lot_size_acres", "beds", "baths", "year_built",
    "zip_median_price", "crime_index", "school_rating_avg",
    "walk_score", "months_supply", "yoy_price_change_pct",
]


@dataclass
class AVMResult:
    estimated_value: int
    confidence_low: int
    confidence_high: int
    confidence_pct: int
    feature_importances: Optional[dict] = None


class LandGrabAVM:

    def _load_model(self):
        if not os.path.exists(MODEL_PATH):
            return None
        try:
            import joblib
            return joblib.load(MODEL_PATH)
        except Exception:
            return None

    async def estimate(self, property_id: str, db) -> Optional[dict]:
        model = self._load_model()
        if not model:
            return {
                "status": "unavailable",
                "message": "AVM model not yet trained. Run the retrain_avm task to initialize.",
            }

        from sqlalchemy import select
        from app.models.property import Property
        from app.services.neighborhood_service import NeighborhoodService
        from app.services.market_service import MarketService

        try:
            uid = uuid.UUID(property_id)
        except ValueError:
            return None

        prop_result = await db.execute(select(Property).where(Property.id == uid))
        prop = prop_result.scalar_one_or_none()
        if not prop:
            return None

        neighborhood_service = NeighborhoodService(db)
        market_service = MarketService(db)

        neighborhood = await neighborhood_service.get_or_fetch(prop.zip_code, prop.city, prop.state)
        market = await market_service.get_or_fetch(prop.zip_code)

        features = {
            "sqft": prop.sqft or 0,
            "lot_size_acres": float(prop.lot_size_acres) if prop.lot_size_acres else 0,
            "beds": prop.beds or 0,
            "baths": float(prop.baths) if prop.baths else 0,
            "year_built": prop.year_built or 1970,
            "zip_median_price": float(market.get("median_price", 0) or 0) if market else 0,
            "crime_index": float(neighborhood.get("crime_index", 50) or 50) if neighborhood else 50,
            "school_rating_avg": float(neighborhood.get("school_rating_avg", 5) or 5) if neighborhood else 5,
            "walk_score": int(neighborhood.get("walk_score", 50) or 50) if neighborhood else 50,
            "months_supply": float(market.get("months_of_supply", 4) or 4) if market else 4,
            "yoy_price_change_pct": float(market.get("yoy_price_change_pct", 0) or 0) if market else 0,
        }

        try:
            import pandas as pd
            X = pd.DataFrame([features])[FEATURE_COLUMNS].fillna(0)
            prediction = float(model.predict(X)[0])
            confidence_margin = 0.08

            result = AVMResult(
                estimated_value=int(prediction),
                confidence_low=int(prediction * (1 - confidence_margin)),
                confidence_high=int(prediction * (1 + confidence_margin)),
                confidence_pct=85,
            )

            # Feature importances if available
            importances = None
            if hasattr(model, "named_steps") and hasattr(model.named_steps.get("model"), "feature_importances_"):
                fi = model.named_steps["model"].feature_importances_
                importances = dict(zip(FEATURE_COLUMNS, [round(float(v), 4) for v in fi]))

            return {
                "estimated_value": result.estimated_value,
                "confidence_low": result.confidence_low,
                "confidence_high": result.confidence_high,
                "confidence_pct": result.confidence_pct,
                "vs_list_price_pct": round(
                    (result.estimated_value - float(prop.current_price)) / float(prop.current_price) * 100, 1
                ) if prop.current_price else None,
                "feature_importances": importances,
                "source": "LandGrab AVM v1",
            }
        except Exception:
            return {"status": "error", "message": "Could not compute estimate"}
