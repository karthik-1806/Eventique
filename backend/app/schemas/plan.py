"""Plan Generation Schemas."""

from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import RecommendationImpact, RecommendationPriority, RecommendationType
from app.schemas.budget import BudgetAllocationSuggestion


class VendorRecommendation(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    priority: str = Field(..., min_length=1, max_length=20)
    reasoning: str = Field(..., min_length=1, max_length=500)
    estimatedCostRange: str = Field(..., min_length=1, max_length=100)


class PlanningRecommendation(BaseModel):
    type: RecommendationType
    title: str = Field(..., min_length=1, max_length=150)
    explanation: str = Field(..., min_length=1, max_length=1000)
    impact: RecommendationImpact
    priority: RecommendationPriority
    suggestedAction: str = Field(..., min_length=1, max_length=300)


class PlanGenerationResponse(BaseModel):
    budgetAllocations: List[BudgetAllocationSuggestion] = Field(..., min_length=1, max_length=15)
    vendorRecommendations: List[VendorRecommendation] = Field(..., min_length=1, max_length=10)
    planningRecommendations: List[PlanningRecommendation] = Field(..., min_length=1, max_length=10)
    riskWarnings: List[PlanningRecommendation] = Field(default_factory=list, max_length=5)
    planSummary: str = Field(..., min_length=10, max_length=500)

