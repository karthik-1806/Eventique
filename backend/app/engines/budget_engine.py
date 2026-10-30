"""Deterministic Budget Engine in Python.
AI must NEVER perform arithmetic or budget balancing.
"""

import math
import uuid
from typing import Dict, List
from app.models.enums import Currency, EventType
from app.schemas.budget import Budget, BudgetCategory, BudgetSummary

DEFAULT_ALLOCATIONS: Dict[EventType, List[Dict[str, float]]] = {
    EventType.WEDDING: [
        {"name": "Venue", "percent": 30.0},
        {"name": "Catering", "percent": 25.0},
        {"name": "Photography & Video", "percent": 10.0},
        {"name": "Decoration & Flowers", "percent": 10.0},
        {"name": "Entertainment & Music", "percent": 7.0},
        {"name": "Wedding Attire", "percent": 5.0},
        {"name": "Invitations & Stationery", "percent": 2.0},
        {"name": "Transportation", "percent": 3.0},
        {"name": "Accommodation", "percent": 3.0},
        {"name": "Miscellaneous", "percent": 3.0},
        {"name": "Contingency", "percent": 2.0},
    ],
    EventType.BIRTHDAY: [
        {"name": "Venue", "percent": 25.0},
        {"name": "Catering & Cake", "percent": 30.0},
        {"name": "Decoration", "percent": 15.0},
        {"name": "Entertainment", "percent": 15.0},
        {"name": "Photography", "percent": 8.0},
        {"name": "Invitations", "percent": 2.0},
        {"name": "Transportation", "percent": 2.0},
        {"name": "Miscellaneous", "percent": 2.0},
        {"name": "Contingency", "percent": 1.0},
    ],
    EventType.COMMUNITY: [
        {"name": "Venue", "percent": 20.0},
        {"name": "Catering", "percent": 30.0},
        {"name": "Audio/Visual Equipment", "percent": 12.0},
        {"name": "Decoration & Signage", "percent": 8.0},
        {"name": "Security", "percent": 5.0},
        {"name": "Transportation", "percent": 5.0},
        {"name": "Marketing & Invitations", "percent": 7.0},
        {"name": "Permits & Insurance", "percent": 5.0},
        {"name": "Volunteers & Staff", "percent": 5.0},
        {"name": "Miscellaneous", "percent": 2.0},
        {"name": "Contingency", "percent": 1.0},
    ],
}


def generate_default_budget(event_id: str, event_type: EventType, total_budget: float) -> Budget:
    """Generate default budget categories for an event deterministically."""
    allocations = DEFAULT_ALLOCATIONS.get(event_type, DEFAULT_ALLOCATIONS[EventType.WEDDING])
    safe_total = max(0.0, total_budget)

    categories: List[BudgetCategory] = []
    contingency_percent = 5.0

    for a in allocations:
        if "contingency" in a["name"].lower():
            contingency_percent = a["percent"]

        allocated = int(round((a["percent"] / 100.0) * safe_total))
        categories.append(
            BudgetCategory(
                id=str(uuid.uuid4()),
                name=a["name"],
                allocated=allocated,
                spent=0,
                isLocked=False,
                notes="",
                aiSuggested=False,
            )
        )

    return Budget(
        eventId=event_id,
        categories=categories,
        contingencyPercent=contingency_percent,
    )


def calculate_budget_summary(budget: Budget, total_budget: float) -> BudgetSummary:
    """Calculates summary, utilization, and health metrics deterministically."""
    safe_total = max(0.0, total_budget)
    allocated = sum(c.allocated for c in budget.categories)
    spent = sum(c.spent for c in budget.categories)
    remaining = safe_total - spent

    # Align contingency with actual category allocation to eliminate double-counting
    contingency_cat = next(
        (c for c in budget.categories if "contingency" in c.name.lower()),
        None,
    )
    if contingency_cat:
        contingency_amount = contingency_cat.allocated
    else:
        contingency_amount = int(round((budget.contingencyPercent / 100.0) * safe_total))

    is_over_allocated = allocated > safe_total
    over_allocated_by = allocated - int(safe_total) if is_over_allocated else 0
    utilization_percent = int(round((spent / safe_total) * 100)) if safe_total > 0 else 0

    return BudgetSummary(
        total=safe_total,
        allocated=allocated,
        spent=spent,
        remaining=remaining,
        contingencyAmount=contingency_amount,
        isOverAllocated=is_over_allocated,
        overAllocatedBy=over_allocated_by,
        utilizationPercent=utilization_percent,
    )


def recalculate_budget_for_new_total(
    budget: Budget, old_total: float, new_total: float
) -> Budget:
    """Proportionally scales unlocked categories while strictly preserving locked ones."""
    safe_new = max(0.0, new_total)
    locked_sum = sum(c.allocated for c in budget.categories if c.isLocked)
    unlocked_sum = sum(c.allocated for c in budget.categories if not c.isLocked)

    available_for_unlocked = safe_new - locked_sum
    scale_factor = (available_for_unlocked / unlocked_sum) if unlocked_sum > 0 else 0.0

    new_categories: List[BudgetCategory] = []
    for c in budget.categories:
        if c.isLocked:
            new_categories.append(c)
        else:
            scaled = max(0, int(round(c.allocated * scale_factor)))
            new_categories.append(
                BudgetCategory(
                    id=c.id,
                    name=c.name,
                    allocated=scaled,
                    spent=c.spent,
                    isLocked=c.isLocked,
                    notes=c.notes,
                    aiSuggested=c.aiSuggested,
                )
            )

    return Budget(
        eventId=budget.eventId,
        categories=new_categories,
        contingencyPercent=budget.contingencyPercent,
    )


def get_per_guest_cost(total_budget: float, guest_count: int) -> int:
    """Per-guest cost estimate with safe bounds."""
    if guest_count <= 0:
        return 0
    return int(round(max(0.0, total_budget) / guest_count))


def estimate_catering_cost(guest_count: int, event_type: EventType, currency: str = "INR") -> int:
    """Estimates catering baseline with Indian market rates."""
    rates = {
        EventType.WEDDING: {"INR": 1500, "USD": 75, "EUR": 65, "GBP": 55},
        EventType.BIRTHDAY: {"INR": 800, "USD": 40, "EUR": 35, "GBP": 30},
        EventType.COMMUNITY: {"INR": 600, "USD": 25, "EUR": 22, "GBP": 18},
    }
    event_rates = rates.get(event_type, rates[EventType.WEDDING])
    rate = event_rates.get(currency, event_rates["INR"])
    return rate * max(0, guest_count)


def format_currency(amount: float, currency: str = "INR") -> str:
    """Formats currency supporting Indian numbering (Lakhs/Crores) and negative amounts."""
    is_neg = amount < 0
    abs_amt = abs(amount)
    symbols = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}
    sym = symbols.get(currency, currency)
    prefix = f"-{sym}" if is_neg else sym

    if currency == "INR":
        if abs_amt >= 10_000_000:
            return f"{prefix}{abs_amt / 10_000_000:.2f}Cr"
        if abs_amt >= 100_000:
            return f"{prefix}{abs_amt / 100_000:.2f}L"
        if abs_amt >= 1_000:
            return f"{prefix}{abs_amt / 1_000:.1f}K"
        return f"{prefix}{int(abs_amt):,}"

    if abs_amt >= 1_000_000:
        return f"{prefix}{abs_amt / 1_000_000:.1f}M"
    if abs_amt >= 1_000:
        return f"{prefix}{abs_amt / 1_000:.1f}K"
    return f"{prefix}{int(abs_amt):,}"

