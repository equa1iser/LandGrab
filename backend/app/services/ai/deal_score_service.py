import uuid
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.deal_score import DealScore
from app.models.property import Property
from app.services.ai.scoring_engine import ScoringEngine
from app.services.ai.claude_analyzer import analyze_with_claude, format_property_briefing
from app.services.neighborhood_service import NeighborhoodService
from app.services.market_service import MarketService
from app.services.comps_service import CompsService


class DealScoreService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.engine = ScoringEngine()

    async def get_or_compute(self, property_id: str) -> Optional[dict]:
        try:
            uid = uuid.UUID(property_id)
        except ValueError:
            return None

        # Check for valid cached score
        result = await self.db.execute(
            select(DealScore)
            .where(DealScore.property_id == uid)
            .order_by(DealScore.created_at.desc())
            .limit(1)
        )
        score = result.scalar_one_or_none()
        if score and score.expires_at and score.expires_at > datetime.utcnow():
            return self._to_dict(score)

        # Load property
        prop_result = await self.db.execute(
            select(Property)
            .options(selectinload(Property.price_history), selectinload(Property.tax_history))
            .where(Property.id == uid)
        )
        prop = prop_result.scalar_one_or_none()
        if not prop:
            return None

        # Fetch supplemental data
        neighborhood_service = NeighborhoodService(self.db)
        market_service = MarketService(self.db)
        comps_service = CompsService(self.db)

        neighborhood = await neighborhood_service.get_or_fetch(
            prop.zip_code, prop.city, prop.state
        )
        market = await market_service.get_or_fetch(prop.zip_code)
        comps = await comps_service.get_comps(property_id)
        comps_dicts = [c.model_dump() for c in comps]

        tax_history = [
            {"year": th.year, "tax_amount": float(th.tax_amount) if th.tax_amount else None}
            for th in prop.tax_history
        ]
        price_history = [
            {"event_date": str(ph.event_date), "price": float(ph.price)}
            for ph in prop.price_history
        ]

        # Rule-based component scores
        components = self.engine.compute_component_scores(
            current_price=float(prop.current_price) if prop.current_price else None,
            comps=comps_dicts,
            neighborhood=neighborhood,
            market=market,
            tax_history=tax_history,
            price_history=price_history,
        )
        composite = self.engine.compute_composite(components)
        component_dict = {
            "price_vs_comps": components.price_vs_comps,
            "market_timing": components.market_timing,
            "neighborhood": components.neighborhood,
            "growth_potential": components.growth_potential,
            "tax_burden": components.tax_burden,
            "price_trend": components.price_trend,
        }

        # Claude analysis (optional)
        address = f"{prop.address_line1}, {prop.city}, {prop.state} {prop.zip_code}"
        briefing = format_property_briefing(
            address=address,
            price=float(prop.current_price) if prop.current_price else None,
            sqft=prop.sqft,
            beds=prop.beds,
            baths=float(prop.baths) if prop.baths else None,
            year_built=prop.year_built,
            comps=comps_dicts,
            neighborhood=neighborhood,
            market=market,
            tax_history=tax_history,
            component_scores=component_dict,
            composite_score=composite,
        )

        claude_result = await analyze_with_claude(briefing, component_dict, composite)

        # Blend: 70% rule-based + 30% Claude
        if claude_result and claude_result.get("adjusted_score") is not None:
            final_score = int(composite * 0.70 + claude_result["adjusted_score"] * 0.30)
            grade = claude_result.get("grade", self.engine.score_to_grade(final_score))
            verdict = claude_result.get("verdict")
            ai_analysis = claude_result.get("summary")
            key_factors = claude_result.get("key_factors", [])
            risks = claude_result.get("risks", [])
            opportunities = claude_result.get("opportunities", [])
        else:
            final_score = composite
            grade = self.engine.score_to_grade(final_score)
            verdict = self._score_to_verdict(final_score)
            ai_analysis = None
            key_factors = []
            risks = []
            opportunities = []

        # Persist
        new_score = DealScore(
            property_id=uid,
            score=final_score,
            grade=grade,
            verdict=verdict,
            ai_analysis=ai_analysis,
            score_components=component_dict,
            key_factors=key_factors,
            risks=risks,
            opportunities=opportunities,
            expires_at=datetime.utcnow() + timedelta(hours=12),
        )
        self.db.add(new_score)
        await self.db.commit()

        return self._to_dict(new_score)

    def _score_to_verdict(self, score: int) -> str:
        if score >= 80:
            return "STRONG BUY"
        if score >= 65:
            return "BUY"
        if score >= 50:
            return "NEUTRAL"
        if score >= 35:
            return "AVOID"
        return "STRONG AVOID"

    def _to_dict(self, score: DealScore) -> dict:
        return {
            "score": score.score,
            "grade": score.grade,
            "verdict": score.verdict,
            "ai_analysis": score.ai_analysis,
            "score_components": score.score_components,
            "key_factors": score.key_factors,
            "risks": score.risks,
            "opportunities": score.opportunities,
            "computed_at": score.created_at.isoformat(),
        }
