"""Tests for what-if scenario simulations."""

from app.engines.budget_engine import generate_default_budget
from app.engines.scenario_engine import (
    calculate_tiered_budget_reduction,
    simulate_vendor_dropout,
    simulate_weather_contingency,
)
from app.models.enums import EventType


def test_tiered_budget_reduction_protects_core_contracts():
    budget = generate_default_budget("test-1", EventType.WEDDING, 1000000.0)
    adjustments, total_red = calculate_tiered_budget_reduction(
        1000000.0, 850000.0, budget, "INR"
    )

    assert total_red == 150000.0
    assert len(adjustments) > 0

    # Total differences should equal the reduction amount
    sum_diffs = sum(abs(a.difference) for a in adjustments)
    assert sum_diffs == 150000

    # Discretionary categories (Decoration, Transportation, Entertainment) absorb cuts
    adj_map = {a.categoryName: a for a in adjustments}
    assert "Decoration & Flowers" in adj_map
    assert "Transportation" in adj_map


def test_vendor_dropout_simulation():
    budget = generate_default_budget("test-1", EventType.WEDDING, 1000000.0)
    impact = simulate_vendor_dropout("Photography & Video", budget, "INR")

    assert impact.overallRiskLevel == "high"
    assert impact.financialDelta > 0  # Rush surcharge
    assert any("replacement" in t.lower() for t in impact.affectedTasks)


def test_weather_contingency_simulation():
    budget = generate_default_budget("test-1", EventType.WEDDING, 1000000.0)
    impact = simulate_weather_contingency(budget, 250, "INR")

    assert impact.overallRiskLevel == "medium"
    assert impact.financialDelta == 75000  # 250 * 300
    assert any("tenting" in t.lower() for t in impact.affectedTasks)

