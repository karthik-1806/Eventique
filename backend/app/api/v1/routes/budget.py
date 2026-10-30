"""Deterministic budget calculation endpoints."""

from typing import Dict, List
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.engines.budget_engine import (
    calculate_budget_summary,
    estimate_catering_cost,
    generate_default_budget,
    get_per_guest_cost,
    recalculate_budget_for_new_total,
)
from app.models.enums import Currency, EventType
from app.schemas.budget import Budget, BudgetSummary

router = APIRouter()


class DefaultBudgetRequest(BaseModel):
    eventId: str
    eventType: EventType
    totalBudget: float = Field(..., ge=0)


class BudgetSummaryRequest(BaseModel):
    budget: Budget
    totalBudget: float = Field(..., ge=0)


class RecalculateBudgetRequest(BaseModel):
    budget: Budget
    oldTotal: float
    newTotal: float = Field(..., ge=0)


class CateringEstimateRequest(BaseModel):
    guestCount: int = Field(..., ge=0)
    eventType: EventType
    currency: Currency = Currency.INR


@router.post("/budget/default", response_model=Budget)
def default_budget_endpoint(req: DefaultBudgetRequest):
    return generate_default_budget(req.eventId, req.eventType, req.totalBudget)


@router.post("/budget/summary", response_model=BudgetSummary)
def budget_summary_endpoint(req: BudgetSummaryRequest):
    return calculate_budget_summary(req.budget, req.totalBudget)


@router.post("/budget/recalculate", response_model=Budget)
def budget_recalculate_endpoint(req: RecalculateBudgetRequest):
    return recalculate_budget_for_new_total(req.budget, req.oldTotal, req.newTotal)


@router.post("/budget/catering-estimate")
def catering_estimate_endpoint(req: CateringEstimateRequest):
    cost = estimate_catering_cost(req.guestCount, req.eventType, req.currency.value)
    per_guest = get_per_guest_cost(cost, req.guestCount)
    return {"estimatedCateringCost": cost, "perGuestRate": per_guest}
