import json
from typing import Optional

from app.core.config import settings

SYSTEM_PROMPT = """You are LandGrab AI, a tactical real estate analysis system built to help buyers make informed decisions.
Your role is to analyze property data and produce a concise, data-driven assessment of whether a property is a good deal.

Analysis style:
- Direct and tactical — no fluff, no marketing language
- Reference specific numbers from the data provided
- Identify the 3-5 most important factors (both positive and negative)
- Give a final verdict the buyer can act on
- Tone: like a professional briefing, not a sales pitch

You MUST respond with valid JSON only, no other text. Use this exact schema:
{
  "adjusted_score": <integer 0-100>,
  "grade": <"A"|"B"|"C"|"D"|"F">,
  "verdict": <"STRONG BUY"|"BUY"|"NEUTRAL"|"AVOID"|"STRONG AVOID">,
  "summary": "<2-3 sentence narrative>",
  "key_factors": [
    {"factor": "<name>", "impact": <"positive"|"negative"|"neutral">, "detail": "<brief explanation>"}
  ],
  "risks": ["<risk 1>", "<risk 2>"],
  "opportunities": ["<opp 1>", "<opp 2>"]
}"""


def format_property_briefing(
    address: str,
    price: Optional[float],
    sqft: Optional[int],
    beds: Optional[int],
    baths: Optional[float],
    year_built: Optional[int],
    comps: list[dict],
    neighborhood: Optional[dict],
    market: Optional[dict],
    tax_history: list[dict],
    component_scores: dict,
    composite_score: int,
) -> str:
    lines = [
        f"PROPERTY: {address}",
        f"PRICE: ${price:,.0f}" if price else "PRICE: Unknown",
        f"SIZE: {sqft:,} sqft | {beds}br/{baths}ba | Built {year_built}" if sqft else "",
        "",
    ]

    if comps:
        lines.append(f"COMPARABLE SALES (last 90 days):")
        comp_prices = []
        for c in comps[:5]:
            p = c.get("price", 0)
            comp_prices.append(p)
            dist = f"{c.get('distance_miles', '?')}mi" if c.get("distance_miles") else ""
            pct = ""
            if price and p:
                diff = (p - price) / price * 100
                pct = f" | subject is {abs(diff):.1f}% {'BELOW' if diff > 0 else 'ABOVE'} this comp"
            lines.append(f"  - {c.get('address', 'N/A')}: ${p:,.0f} ({dist} away, {c.get('sale_date', '?')}){pct}")
        if comp_prices and price:
            avg = sum(comp_prices) / len(comp_prices)
            pct_vs_avg = (avg - price) / avg * 100
            lines.append(f"COMP AVERAGE: ${avg:,.0f} | Subject is {abs(pct_vs_avg):.1f}% {'below' if pct_vs_avg > 0 else 'above'} comp average")
        lines.append("")

    if neighborhood:
        lines.append("NEIGHBORHOOD:")
        if neighborhood.get("crime_index") is not None:
            lines.append(f"  Crime Index: {neighborhood['crime_index']}/100 (Grade: {neighborhood.get('crime_grade', 'N/A')}, lower = safer)")
        if neighborhood.get("school_rating_avg") is not None:
            lines.append(f"  School Rating: {neighborhood['school_rating_avg']}/10 avg")
        if neighborhood.get("walk_score") is not None:
            lines.append(f"  Walk Score: {neighborhood['walk_score']}/100")
        if neighborhood.get("median_household_income") is not None:
            lines.append(f"  Median Income: ${neighborhood['median_household_income']:,.0f}")
        if neighborhood.get("median_home_value") is not None:
            lines.append(f"  Median Home Value: ${neighborhood['median_home_value']:,.0f}")
        if neighborhood.get("owner_occupied_pct") is not None:
            lines.append(f"  Owner-Occupied: {neighborhood['owner_occupied_pct']:.0f}%")
        if neighborhood.get("population_growth_pct") is not None:
            lines.append(f"  Population Growth: {neighborhood['population_growth_pct']:+.1f}%/yr")
        lines.append("")

    if market:
        lines.append("MARKET CONDITIONS:")
        if market.get("months_of_supply") is not None:
            supply = market["months_of_supply"]
            temp = "HOT (seller's market)" if supply < 3 else "BALANCED" if supply < 6 else "COOL (buyer's market)"
            lines.append(f"  Months of Supply: {supply} — {temp}")
        if market.get("median_days_on_market") is not None:
            lines.append(f"  Median Days on Market: {market['median_days_on_market']}")
        if market.get("yoy_price_change_pct") is not None:
            lines.append(f"  YoY Price Change: {market['yoy_price_change_pct']:+.1f}%")
        if market.get("mom_price_change_pct") is not None:
            lines.append(f"  MoM Price Change: {market['mom_price_change_pct']:+.1f}%")
        v30 = market.get("sales_volume_30d")
        v90 = market.get("sales_volume_90d")
        if v30 is not None and v90 is not None and float(v90) > 0:
            ratio = float(v30) * 3 / float(v90)
            trend = "ACCELERATING" if ratio > 1.1 else "SLOWING" if ratio < 0.9 else "STABLE"
            lines.append(f"  Sales Velocity: {v30} (30d) vs {v90} (90d) — {trend}")
        if market.get("interest_rate_30yr") is not None:
            lines.append(f"  Current 30yr Rate: {market['interest_rate_30yr']:.2f}%")
        lines.append("")

    if tax_history:
        latest_tax = sorted(tax_history, key=lambda x: x.get("year", 0), reverse=True)[0]
        if latest_tax.get("tax_amount") and price:
            rate = float(latest_tax["tax_amount"]) / price * 100
            lines.append(f"PROPERTY TAX: ${float(latest_tax['tax_amount']):,.0f}/yr ({rate:.2f}% effective rate)")
            lines.append("")

    lines.append("COMPONENT SCORES (rule-based):")
    for key, score in component_scores.items():
        lines.append(f"  {key.replace('_', ' ').title()}: {score}/100")
    lines.append(f"COMPOSITE SCORE: {composite_score}/100")

    return "\n".join(lines)


async def analyze_with_claude(
    property_briefing: str,
    component_scores: dict,
    composite_score: int,
) -> Optional[dict]:
    if settings.GROQ_API_KEY:
        return await _analyze_with_groq(property_briefing)
    if settings.ANTHROPIC_API_KEY:
        return await _analyze_with_anthropic(property_briefing)
    return None


async def _analyze_with_groq(property_briefing: str) -> Optional[dict]:
    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=1024,
            temperature=0.1,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Analyze this property and provide your assessment:\n\n{property_briefing}"},
            ],
        )
        text = response.choices[0].message.content.strip()
        # Open-source models sometimes wrap JSON in ```json ... ``` fences
        if text.startswith("```"):
            text = text.split("```")[1].lstrip("json").strip()
        return json.loads(text)
    except Exception:
        return None


async def _analyze_with_anthropic(property_briefing: str) -> Optional[dict]:
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": f"Analyze this property and provide your assessment:\n\n{property_briefing}",
                }
            ],
        )
        text = response.content[0].text.strip()
        return json.loads(text)
    except Exception:
        return None
