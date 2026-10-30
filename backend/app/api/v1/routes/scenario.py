"""What-if scenario simulation endpoint."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.engines.scenario_engine import (
    calculate_tiered_budget_reduction,
    simulate_vendor_dropout,
    simulate_weather_contingency,
)
from app.models.enums import Currency
from app.schemas.budget import Budget
from app.schemas.scenario import ScenarioImpact

router = APIRouter()


class SimulateScenarioRequest(BaseModel):
    scenarioType: str = Field(..., description="'budget_cut' | 'guest_surge' | 'vendor_dropout' | 'weather'")
    budget: Budget
    currentBudget: float
    targetBudget: Optional[float] = None
    currentGuests: int
    targetGuests: Optional[int] = None
    vendorCategory: Optional[str] = "Photography"
    currency: Currency = Currency.INR


@router.post("/scenario/simulate", response_model=ScenarioImpact)
def simulate_scenario_endpoint(req: SimulateScenarioRequest):
    currency_str = req.currency.value

    if req.scenarioType == "budget_cut":
        new_b = req.targetBudget if req.targetBudget is not None else (req.currentBudget * 0.85)
        adjustments, total_red = calculate_tiered_budget_reduction(
            req.currentBudget, new_b, req.budget, currency_str
        )
        cut_pct = int(round(((req.currentBudget - new_b) / max(1.0, req.currentBudget)) * 100))
        risk = "high" if cut_pct > 25 else "medium" if cut_pct > 12 else "low"

        return ScenarioImpact(
            financialDelta=-(total_reduction := req.currentBudget - new_b),
            budgetAdjustments=adjustments,
            financialExplanation=f"Budget reduced by {cut_pct}%. Targeted priority water-fall absorbed cuts across {len(adjustments)} discretionary categories to protect core contracts.",
            experienceExplanation="Discretionary items (decor, favors, entertainment duration) scaled down; essential venue & catering baseline preserved.",
            riskExplanation=f"{risk.upper()} RISK: Vendor renegotiations required for {len(adjustments)} categories.",
            affectedTasks=["Renegotiate vendor quotes", "Update budget allocations", "Review payment schedule"],
            overallRiskLevel=risk,
        )

    elif req.scenarioType == "vendor_dropout":
        category = req.vendorCategory or "Catering"
        return simulate_vendor_dropout(category, req.budget, currency_str)

    elif req.scenarioType == "weather":
        return simulate_weather_contingency(req.budget, req.currentGuests, currency_str)

    elif req.scenarioType == "guest_surge":
        new_g = req.targetGuests if req.targetGuests is not None else int(req.currentGuests * 1.5)
        delta_g = new_g - req.currentGuests
        per_person = 1200 if currency_str == "INR" else 60
        cost_delta = delta_g * per_person

        return ScenarioImpact(
            financialDelta=cost_delta,
            budgetAdjustments=[],
            financialExplanation=f"Increasing guest count by {delta_g} ({req.currentGuests} → {new_g}) adds ~{req.currency.value} {cost_delta:,.0f} in marginal catering, seating & invitations.",
            experienceExplanation="Higher venue density; catering headcount and seating layout require immediate expansion.",
            riskExplanation="MEDIUM RISK: Confirm venue maximum occupancy rating before issuing additional invitations.",
            affectedTasks=["Update caterer headcount guarantee", "Confirm venue fire-code capacity", "Order additional chairs and tableware"],
            overallRiskLevel="medium",
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported scenario type: {req.scenarioType}")
