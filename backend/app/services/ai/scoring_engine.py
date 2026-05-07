from dataclasses import dataclass
from typing import Optional
from statistics import mean


@dataclass
class ComponentScores:
    price_vs_comps: int
    market_timing: int
    neighborhood: int
    growth_potential: int
    tax_burden: int
    price_trend: int


WEIGHTS = {
    "price_vs_comps": 0.35,
    "market_timing": 0.20,
    "neighborhood": 0.20,
    "growth_potential": 0.15,
    "tax_burden": 0.05,
    "price_trend": 0.05,
}


def clamp(value: float, lo: float = 0, hi: float = 100) -> int:
    return int(max(lo, min(hi, value)))


class ScoringEngine:

    def __init__(self):
        self._neighborhood_signals = 3  # updated in _score_neighborhood for dynamic weighting

    def compute_component_scores(
        self,
        current_price: Optional[float],
        sqft: Optional[int],
        lot_size_acres: Optional[float],
        property_type: Optional[str],
        comps: list[dict],
        neighborhood: Optional[dict],
        market: Optional[dict],
        tax_history: list[dict],
        price_history: list[dict],
    ) -> ComponentScores:
        return ComponentScores(
            price_vs_comps=self._score_price_vs_comps(current_price, sqft, lot_size_acres, property_type, comps),
            market_timing=self._score_market_timing(market),
            neighborhood=self._score_neighborhood(neighborhood),
            growth_potential=self._score_growth(neighborhood, market),
            tax_burden=self._score_tax_burden(current_price, tax_history),
            price_trend=self._score_price_trend(price_history),
        )

    def compute_composite(self, components: ComponentScores) -> int:
        weights = dict(WEIGHTS)
        if self._neighborhood_signals < 2:
            # Sparse neighborhood data — shift 40% of that weight to price_vs_comps
            excess = weights["neighborhood"] * 0.40
            weights["neighborhood"] -= excess
            weights["price_vs_comps"] += excess
        total = sum(
            getattr(components, key) * weight
            for key, weight in weights.items()
        )
        return clamp(total)

    def score_to_grade(self, score: int) -> str:
        if score >= 85:
            return "A"
        if score >= 70:
            return "B"
        if score >= 55:
            return "C"
        if score >= 40:
            return "D"
        return "F"

    def _score_price_vs_comps(
        self,
        current_price: Optional[float],
        sqft: Optional[int],
        lot_size_acres: Optional[float],
        property_type: Optional[str],
        comps: list[dict],
    ) -> int:
        if not current_price or not comps:
            return 50
        is_land = str(property_type or "").lower() == "land"

        if is_land and lot_size_acres and lot_size_acres > 0:
            subject_ppa = current_price / lot_size_acres
            comp_ppas = []
            for c in comps:
                p = c.get("price")
                a = c.get("lot_size_acres")
                if p and a and float(a) > 0:
                    comp_ppas.append(float(p) / float(a))
            if comp_ppas:
                avg_ppa = mean(comp_ppas)
                return clamp(50 + (avg_ppa - subject_ppa) / avg_ppa * 350)

        if not is_land and sqft and sqft > 0:
            subject_ppsf = current_price / sqft
            comp_ppsf = []
            for c in comps:
                p = c.get("price")
                s = c.get("sqft")
                ppsf = c.get("price_per_sqft")
                if ppsf:
                    comp_ppsf.append(float(ppsf))
                elif p and s and int(s) > 0:
                    comp_ppsf.append(float(p) / int(s))
            if comp_ppsf:
                avg_ppsf = mean(comp_ppsf)
                return clamp(50 + (avg_ppsf - subject_ppsf) / avg_ppsf * 350)

        # Fallback: raw price comparison
        comp_prices = [c["price"] for c in comps if c.get("price")]
        if not comp_prices:
            return 50
        avg_comp = mean(comp_prices)
        return clamp(50 + (avg_comp - current_price) / avg_comp * 350)

    def _score_market_timing(self, market: Optional[dict]) -> int:
        if not market:
            return 50

        weighted_scores: list[tuple[float, float]] = []

        months_supply = market.get("months_of_supply")
        if months_supply is not None:
            mos = float(months_supply)
            if mos >= 6:
                mos_score = clamp(70 + (mos - 6) * 5)
            elif mos <= 2:
                mos_score = clamp(30 - (2 - mos) * 10)
            else:
                mos_score = clamp(30 + (mos - 2) * 10)
            weighted_scores.append((mos_score, 0.70))

        dom = market.get("median_days_on_market")
        if dom is not None:
            # National median ~30 days; slower market = higher buyer score
            dom_score = clamp(50 + (float(dom) - 30) / 30 * 30)
            weighted_scores.append((dom_score, 0.30))

        if not weighted_scores:
            return 50

        total_weight = sum(w for _, w in weighted_scores)
        base = sum(s * w for s, w in weighted_scores) / total_weight

        # Sales velocity modifier: (v30 * 3) / v90 ratio — declining = buyer advantage
        v30 = market.get("sales_volume_30d")
        v90 = market.get("sales_volume_90d")
        if v30 is not None and v90 is not None and float(v90) > 0:
            ratio = float(v30) * 3 / float(v90)
            # Annualized ratio < 1 (slowing) → +pts, > 1 (accelerating) → −pts, capped ±10
            velocity_mod = max(-10.0, min(10.0, 10.0 * (1.0 - ratio)))
            base += velocity_mod

        return clamp(base)

    def _score_neighborhood(self, neighborhood: Optional[dict]) -> int:
        if not neighborhood:
            self._neighborhood_signals = 0
            return 50
        scores = []

        # Prefer raw FBI rates over normalized index — more precise
        violent = neighborhood.get("violent_rate_per_100k")
        prop_crime = neighborhood.get("property_rate_per_100k")
        if violent is not None and prop_crime is not None:
            # National avg: violent ~370, property ~2100 per 100k/yr
            violent_score = clamp(80 - (float(violent) / 370 - 1) * 60)
            property_score = clamp(80 - (float(prop_crime) / 2100 - 1) * 60)
            scores.append((violent_score + property_score) / 2)
        else:
            crime_index = neighborhood.get("crime_index")
            if crime_index is not None:
                scores.append(clamp(100 - float(crime_index)))

        school_rating = neighborhood.get("school_rating_avg")
        if school_rating is not None:
            scores.append(clamp(float(school_rating) * 10))

        walk_score = neighborhood.get("walk_score")
        if walk_score is not None:
            scores.append(int(walk_score))

        self._neighborhood_signals = len(scores)
        return clamp(mean(scores)) if scores else 50

    def _score_growth(self, neighborhood: Optional[dict], market: Optional[dict]) -> int:
        scores = []
        if neighborhood:
            pop_growth = neighborhood.get("population_growth_pct")
            if pop_growth is not None:
                scores.append(clamp(50 + float(pop_growth) * 10))

        if market:
            yoy = market.get("yoy_price_change_pct")
            if yoy is not None:
                scores.append(clamp(50 + float(yoy) * 3))

        return clamp(mean(scores)) if scores else 50

    def _score_tax_burden(
        self, current_price: Optional[float], tax_history: list[dict]
    ) -> int:
        if not current_price or not tax_history:
            return 50
        latest = sorted(tax_history, key=lambda x: x.get("year", 0), reverse=True)
        if not latest or not latest[0].get("tax_amount"):
            return 50
        annual_tax = float(latest[0]["tax_amount"])
        effective_rate = annual_tax / current_price * 100
        base = clamp(80 - (effective_rate - 1) * 30)

        # Assessment vs market price: wide gap may signal price inflation or stale assessment
        assessed = latest[0].get("assessed_value")
        if assessed and float(assessed) > 0:
            assess_ratio = float(assessed) / current_price
            if assess_ratio < 0.70:
                # Assessed well below market — favorable (assessment basis is low)
                base = clamp(base + 5)
            elif assess_ratio > 1.10:
                # Assessed above asking — unfavorable signal
                base = clamp(base - 5)

        return base

    def _score_price_trend(self, price_history: list[dict]) -> int:
        if len(price_history) < 2:
            return 50
        prices = sorted(
            [(p["event_date"], float(p["price"])) for p in price_history if p.get("price")],
            key=lambda x: x[0],
        )
        if len(prices) < 2:
            return 50
        oldest_price = prices[0][1]
        newest_price = prices[-1][1]
        if oldest_price == 0:
            return 50
        # Price dropped from historical high = buyer opportunity (higher score)
        pct_change = (newest_price - oldest_price) / oldest_price
        return clamp(50 - pct_change * 100)
