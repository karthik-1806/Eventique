"""Deterministic Scenario & What-If Simulation Engine in Python.
Models multi-variable planning shifts: budget cuts, guest count surges, vendor dropouts, and weather risks.
"""

import uuid
from typing import Dict, List, Optional, Tuple
from app.engines.budget_engine import format_currency
from app.models.enums import Currency
from app.schemas.budget import Budget
from app.schemas.scenario import BudgetAdjustment, ScenarioChange, ScenarioImpact

# Priority elasticity weights: Discretionary takes cuts first, core contracts are protected
TIER_WEIGHTS: Dict[str, float] = {
    # Tier 1: Discretionary / Flexible (absorbs cuts first)
    "accommodation": 3.5,
    "transportation": 3.5,
    "transport": 3.5,
    "invitations": 3.5,
    "marketing": 3.5,
    "entertainment": 3.2,
    "music": 3.2,
    "decoration": 3.0,
    "flowers": 3.0,
    "signage": 3.0,
    "miscellaneous": 3.0,
    "contingency": 2.8,

    # Tier 2: Semi-Core (moderate cuts)
    "photography": 1.5,
    "video": 1.5,
    "audio/visual": 1.5,
    "av": 1.5,
    "attire": 1.4,

    # Tier 3: Core Essentials (strongly protected)
    "catering": 0.5,
    "cake": 0.6,
    "venue": 0.3,
    "security": 0.5,
    "permits": 0.4,
    "staff": 0.5,
    "volunteers": 0.5,
}


def _get_tier_weight(category_name: str) -> float:
    name_lower = category_name.lower()
    for key, weight in TIER_WEIGHTS.items():
        if key in name_lower:
            return weight
    return 1.0


def calculate_tiered_budget_reduction(
    current_budget: float,
    new_budget: float,
    budget: Budget,
    currency: str = "INR",
) -> Tuple[List[BudgetAdjustment], float]:
    """
    Tiered water-fall budget reduction:
    Discretionary categories absorb cuts first to preserve essential venue and catering.
    """
    safe_current = max(0.0, current_budget)
    safe_new = max(0.0, new_budget)
    total_reduction = safe_current - safe_new

    if total_reduction <= 0 or safe_current <= 0:
        return [], 0.0

    unlocked = [c for c in budget.categories if not c.isLocked and c.allocated > 0]
    if not unlocked:
        return [], 0.0

    total_weighted = sum(c.allocated * _get_tier_weight(c.name) for c in unlocked)
    adjustments: List[BudgetAdjustment] = []
    reduction_so_far = 0

    for i, cat in enumerate(unlocked):
        is_last = i == len(unlocked) - 1
        tier_weight = _get_tier_weight(cat.name)

        if is_last:
            target_cut = int(total_reduction) - reduction_so_far
        else:
            share = (cat.allocated * tier_weight) / total_weighted if total_weighted > 0 else (1 / len(unlocked))
            target_cut = int(round(total_reduction * share))

        actual_cut = min(cat.allocated, max(0, target_cut))
        reduction_so_far += actual_cut

        if actual_cut > 0:
            suggested_amount = cat.allocated - actual_cut
            adjustments.append(
                BudgetAdjustment(
                    categoryId=cat.id,
                    categoryName=cat.name,
                    currentAmount=cat.allocated,
                    suggestedAmount=suggested_amount,
                    difference=-actual_cut,
                    reason=f"Priority-weighted cut: -{format_currency(actual_cut, currency)}",
                )
            )

    return adjustments, total_reduction


def simulate_vendor_dropout(
    vendor_category: str,
    budget: Budget,
    currency: str = "INR",
) -> ScenarioImpact:
    """Simulates a sudden vendor cancellation, linked task blocks, and rush replacement surcharge."""
    cat_match = next((c for c in budget.categories if vendor_category.lower() in c.name.lower()), None)
    base_cost = cat_match.allocated if cat_match else 50000
    rush_fee = int(round(base_cost * 0.20))  # 20% rush surcharge for short-notice vendor replacement

    adjustments: List[BudgetAdjustment] = []
    contingency_cat = next((c for c in budget.categories if "contingency" in c.name.lower()), None)

    if contingency_cat and contingency_cat.allocated >= rush_fee:
        adjustments.append(
            BudgetAdjustment(
                categoryId=contingency_cat.id,
                categoryName=contingency_cat.name,
                currentAmount=contingency_cat.allocated,
                suggestedAmount=contingency_cat.allocated - rush_fee,
                difference=-rush_fee,
                reason=f"Contingency buffer absorbed {format_currency(rush_fee, currency)} rush replacement fee",
            )
        )

    return ScenarioImpact(
        financialDelta=rush_fee,
        budgetAdjustments=adjustments,
        financialExplanation=f"Vendor dropout for {vendor_category} incurs an estimated {format_currency(rush_fee, currency)} (20%) rush re-booking premium.",
        experienceExplanation=f"Immediate replacement needed for {vendor_category}. Vendor contracts must be renegotiated promptly.",
        riskExplanation="HIGH RISK: Critical service gap. Dependent timeline tasks require emergency scheduling.",
        affectedTasks=[f"Emergency replacement search for {vendor_category}", "Vendor contract review", "Schedule expedited walkthrough"],
        overallRiskLevel="high",
    )


def simulate_weather_contingency(
    budget: Budget,
    guest_count: int,
    currency: str = "INR",
) -> ScenarioImpact:
    """Simulates bad weather contingency for outdoor events (waterproofing, canopy rentals, backup hall)."""
    canopy_cost = int(round(max(1, guest_count) * (300 if currency == "INR" else 15)))

    return ScenarioImpact(
        financialDelta=canopy_cost,
        budgetAdjustments=[],
        financialExplanation=f"Inclement weather requires weatherproofing and modular canopy rental: {format_currency(canopy_cost, currency)}.",
        experienceExplanation="Ensures dry, comfortable guest seating and protects electrical sound/lighting equipment.",
        riskExplanation="MEDIUM RISK: Outdoor power distribution and walkway drainage require active monitoring.",
        affectedTasks=["Confirm rain contingency tenting", "Inspect venue covered backup spaces", "Verify waterproof electrical enclosures"],
        overallRiskLevel="medium",
    )
