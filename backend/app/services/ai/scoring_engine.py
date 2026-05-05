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

    def compute_component_scores(
        self,
        current_price: Optional[float],
        comps: list[dict],
        neighborhood: Optional[dict],
        market: Optional[dict],
        tax_history: list[dict],
        price_history: list[dict],
    ) -> ComponentScores:
        return ComponentScores(
            price_vs_comps=self._score_price_vs_comps(current_price, comps),
            market_timing=self._score_market_timing(market),
            neighborhood=self._score_neighborhood(neighborhood),
            growth_potential=self._score_growth(neighborhood, market),
            tax_burden=self._score_tax_burden(current_price, tax_history),
            price_trend=self._score_price_trend(price_history),
        )

    def compute_composite(self, components: ComponentScores) -> int:
        total = sum(
            getattr(components, key) * weight
            for key, weight in WEIGHTS.items()
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
        self, current_price: Optional[float], comps: list[dict]
    ) -> int:
        if not current_price or not comps:
            return 50  # neutral when no data
        comp_prices = [c["price"] for c in comps if c.get("price")]
        if not comp_prices:
            return 50
        avg_comp = mean(comp_prices)
        pct_diff = (avg_comp - current_price) / avg_comp
        # +35pts at 10% below comps, -35pts at 10% above, linear
        return clamp(50 + pct_diff * 350)

    def _score_market_timing(self, market: Optional[dict]) -> int:
        if not market:
            return 50
        months_supply = market.get("months_of_supply")
        if months_supply is None:
            return 50
        # Buyer's market: >6 months supply = 70+ score
        # Seller's market: <3 months = 30- score
        if months_supply >= 6:
            return clamp(70 + (months_supply - 6) * 5)
        if months_supply <= 2:
            return clamp(30 - (2 - months_supply) * 10)
        # 2-6 months: linear scale 30-70
        return clamp(30 + (months_supply - 2) * 10)

    def _score_neighborhood(self, neighborhood: Optional[dict]) -> int:
        if not neighborhood:
            return 50
        scores = []

        # Prefer raw FBI rates over normalized index — more precise
        violent = neighborhood.get("violent_rate_per_100k")
        prop_crime = neighborhood.get("property_rate_per_100k")
        if violent is not None and prop_crime is not None:
            # National avg: violent ~370, property ~2100 per 100k/yr
            # Score 80 at half-national, 20 at double-national, linear
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

        return clamp(mean(scores)) if scores else 50

    def _score_growth(self, neighborhood: Optional[dict], market: Optional[dict]) -> int:
        scores = []
        if neighborhood:
            pop_growth = neighborhood.get("population_growth_pct")
            if pop_growth is not None:
                # +2% annual growth = 70, -1% = 30
                scores.append(clamp(50 + float(pop_growth) * 10))

        if market:
            yoy = market.get("yoy_price_change_pct")
            if yoy is not None:
                # Price appreciation is positive for investment
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
        # < 1% tax rate = great (80+), > 3% = poor (20-)
        return clamp(80 - (effective_rate - 1) * 30)

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
        # Price dropped from historical = buyer opportunity (higher score)
        pct_change = (newest_price - oldest_price) / oldest_price
        # If current price is below peak = good for buyer
        return clamp(50 - pct_change * 100)
