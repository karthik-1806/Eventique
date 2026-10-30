"""Domain Enums for Eventique Planning Assistant."""

from enum import Enum


class EventType(str, Enum):
    WEDDING = "wedding"
    BIRTHDAY = "birthday"
    COMMUNITY = "community"


class Currency(str, Enum):
    INR = "INR"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"


class TaskStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


class TaskPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class VendorStatus(str, Enum):
    RESEARCHING = "researching"
    CONTACTED = "contacted"
    BOOKED = "booked"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class RecommendationType(str, Enum):
    BUDGET = "budget"
    TIMELINE = "timeline"
    VENDOR = "vendor"
    RISK = "risk"
    PERSONALIZATION = "personalization"
    IDEA = "idea"


class RecommendationPriority(str, Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RecommendationImpact(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

