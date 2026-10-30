"""Tests for deterministic budget engine."""

from app.engines.budget_engine import (
    calculate_budget_summary,
    estimate_catering_cost,
    format_currency,
    generate_default_budget,
    get_per_guest_cost,
    recalculate_budget_for_new_total,
)
from app.models.enums import Currency, EventType


def test_generate_default_budget_wedding():
    budget = generate_default_budget("test-1", EventType.WEDDING, 1000000.0)
    assert budget.eventId == "test-1"
    assert len(budget.categories) == 11
    total_allocated = sum(c.allocated for c in budget.categories)
    assert total_allocated == 1000000

    # Verify contingency category is properly aligned
    contingency = next(c for c in budget.categories if "contingency" in c.name.lower())
    assert contingency.allocated == 20000  # 2% of 1,000,000
    assert budget.contingencyPercent == 2.0


def test_generate_default_budget_birthday():
    budget = generate_default_budget("test-bday", EventType.BIRTHDAY, 50000.0)
    total_allocated = sum(c.allocated for c in budget.categories)
    assert total_allocated == 50000


def test_generate_default_budget_community():
    budget = generate_default_budget("test-comm", EventType.COMMUNITY, 500000.0)
    total_allocated = sum(c.allocated for c in budget.categories)
    assert total_allocated == 500000
    assert any("volunteers" in c.name.lower() for c in budget.categories)


def test_budget_summary_contingency_alignment():
    budget = generate_default_budget("test-1", EventType.WEDDING, 1000000.0)
    summary = calculate_budget_summary(budget, 1000000.0)
    assert summary.total == 1000000.0
    assert summary.allocated == 1000000
    assert summary.spent == 0
    assert summary.contingencyAmount == 20000
    assert not summary.isOverAllocated
    assert summary.overAllocatedBy == 0


def test_recalculate_budget_preserving_locks():
    budget = generate_default_budget("test-1", EventType.WEDDING, 1000000.0)
    # Lock the venue category at 300,000
    venue_cat = next(c for c in budget.categories if c.name == "Venue")
    venue_cat.isLocked = True

    # Reduce budget to 800,000
    updated = recalculate_budget_for_new_total(budget, 1000000.0, 800000.0)
    updated_venue = next(c for c in updated.categories if c.name == "Venue")
    assert updated_venue.allocated == 300000  # Strictly preserved

    # Unlocked categories scaled down
    updated_catering = next(c for c in updated.categories if c.name == "Catering")
    assert updated_catering.allocated < 250000


def test_format_currency_inr_and_usd():
    assert format_currency(15000000, "INR") == "₹1.50Cr"
    assert format_currency(850000, "INR") == "₹8.50L"
    assert format_currency(45000, "INR") == "₹45.0K"
    assert format_currency(-150000, "INR") == "-₹1.50L"
    assert format_currency(2500000, "USD") == "$2.5M"
    assert format_currency(5000, "USD") == "$5.0K"


def test_per_guest_and_catering_bounds():
    assert get_per_guest_cost(1000000, 250) == 4000
    assert get_per_guest_cost(1000000, 0) == 0
    assert get_per_guest_cost(0, 50) == 0
    assert estimate_catering_cost(250, EventType.WEDDING, "INR") == 375000
    assert estimate_catering_cost(0, EventType.WEDDING, "INR") == 0

