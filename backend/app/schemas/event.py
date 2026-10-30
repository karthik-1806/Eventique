"""Event Profile and Context Schemas."""

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import Currency, EventType


class EventProfile(BaseModel):
    id: str
    type: EventType
    name: str = Field(..., min_length=1, max_length=200)
    date: str = Field(..., description="YYYY-MM-DD format")
    location: str = Field(..., min_length=1, max_length=300)
    guestCount: int = Field(..., ge=1, le=50000)
    totalBudget: float = Field(..., ge=0, le=1_000_000_000)
    currency: Currency = Currency.INR
    style: Optional[str] = Field(default="Standard", max_length=100)
    priorities: List[str] = Field(default_factory=list, max_length=10)
    requirements: Optional[str] = Field(default="", max_length=1000)
    createdAt: Optional[str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: Optional[str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EventContext(BaseModel):
    eventType: EventType
    eventName: str = Field(..., min_length=1, max_length=200)
    date: str
    location: str = Field(..., min_length=1, max_length=300)
    guestCount: int = Field(..., ge=1, le=50000)
    totalBudget: float = Field(..., ge=0, le=1_000_000_000)
    currency: Currency = Currency.INR
    style: Optional[str] = "Standard"
    priorities: List[str] = Field(default_factory=list)
    requirements: Optional[str] = ""
    daysUntilEvent: int = 0

