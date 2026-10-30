"""Scenario Simulation Schemas."""

from typing import Any, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class ScenarioChange(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    field: str
    label: Optional[str] = None
    from_: Union[int, float, str, List[str]] = Field(..., alias="from")
    to: Union[int, float, str, List[str]]
    categoryId: Optional[str] = None
    reason: Optional[str] = None


class BudgetAdjustment(BaseModel):
    categoryId: str
    categoryName: str
    currentAmount: int
    suggestedAmount: int
    difference: int
    reason: str


class ScenarioImpact(BaseModel):
    financialDelta: float
    budgetAdjustments: List[BudgetAdjustment]
    financialExplanation: str
    experienceExplanation: str
    riskExplanation: str
    affectedTasks: List[str]
    overallRiskLevel: str  # 'low' | 'medium' | 'high'


class Scenario(BaseModel):
    id: str
    eventId: str
    name: str
    description: str
    changes: List[ScenarioChange]
    impact: ScenarioImpact
    applied: bool = False
    createdAt: str


class ScenarioSimulationRequest(BaseModel):
    scenarioType: str = Field(..., description="'budget_cut', 'guest_increase', 'vendor_dropout', 'weather_risk', 'custom'")
    paramValue: Optional[float] = None
    vendorCategory: Optional[str] = None

