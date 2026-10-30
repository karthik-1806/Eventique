"""Budget Schemas for Deterministic Engine and APIs."""

from typing import List, Optional
from pydantic import BaseModel, Field


class BudgetCategory(BaseModel):
    id: str
    name: str
    allocated: int = Field(..., ge=0)
    spent: int = Field(default=0, ge=0)
    isLocked: bool = False
    notes: Optional[str] = ""
    aiSuggested: Optional[bool] = False


class Budget(BaseModel):
    eventId: str
    categories: List[BudgetCategory]
    contingencyPercent: float = 5.0


class BudgetSummary(BaseModel):
    total: float
    allocated: int
    spent: int
    remaining: float
    contingencyAmount: int
    isOverAllocated: bool
    overAllocatedBy: int
    utilizationPercent: int


class BudgetAllocationSuggestion(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    percent: float = Field(..., ge=0.0, le=100.0)
    reasoning: Optional[str] = Field(default="", max_length=500)

