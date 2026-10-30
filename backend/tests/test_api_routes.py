"""FastAPI Route Integration Tests without transport overhead."""

from fastapi import Request, Response
from app.api.v1.routes.budget import (
    BudgetSummaryRequest,
    DefaultBudgetRequest,
    budget_summary_endpoint,
    default_budget_endpoint,
)
from app.api.v1.routes.chat import chat_endpoint
from app.api.v1.routes.health import health_check
from app.api.v1.routes.plan import generate_plan_endpoint
from app.api.v1.routes.scenario import SimulateScenarioRequest, simulate_scenario_endpoint
from app.api.v1.routes.timeline import GenerateTimelineRequest, generate_timeline_endpoint
from app.models.enums import Currency, EventType
from app.schemas.chat import ChatRequest


def make_dummy_request():
    scope = {"type": "http", "client": ("127.0.0.1", 12345), "headers": []}
    return Request(scope)


def test_health_check_endpoint():
    data = health_check()
    assert data["status"] == "healthy"
    assert "wedding" in data["supportedEventTypes"]
    assert "INR" in data["supportedCurrencies"]


def test_budget_default_and_summary_endpoints():
    b_req = DefaultBudgetRequest(
        eventId="test-b-1",
        eventType=EventType.WEDDING,
        totalBudget=1000000.0,
    )
    budget = default_budget_endpoint(b_req)
    assert len(budget.categories) == 11
    assert budget.contingencyPercent == 2.0

    s_req = BudgetSummaryRequest(budget=budget, totalBudget=1000000.0)
    summary = budget_summary_endpoint(s_req)
    assert summary.allocated == 1000000
    assert summary.contingencyAmount == 20000
    assert summary.remaining == 1000000.0
    assert not summary.isOverAllocated


def test_timeline_generate_endpoint():
    t_req = GenerateTimelineRequest(
        eventId="evt-1",
        eventType=EventType.WEDDING,
        eventDate="2026-12-31",
    )
    tasks = generate_timeline_endpoint(t_req)
    assert len(tasks) > 5
    assert any(t.priority.value == "critical" for t in tasks)


def test_scenario_simulate_endpoint():
    b_req = DefaultBudgetRequest(
        eventId="test-b-1",
        eventType=EventType.WEDDING,
        totalBudget=1000000.0,
    )
    budget = default_budget_endpoint(b_req)

    # 15% Budget cut
    sc_req = SimulateScenarioRequest(
        scenarioType="budget_cut",
        budget=budget,
        currentBudget=1000000.0,
        targetBudget=850000.0,
        currentGuests=200,
        currency=Currency.INR,
    )
    impact = simulate_scenario_endpoint(sc_req)
    assert impact.financialDelta == -150000.0
    assert len(impact.budgetAdjustments) > 0

    # Vendor dropout
    v_req = SimulateScenarioRequest(
        scenarioType="vendor_dropout",
        budget=budget,
        currentBudget=1000000.0,
        currentGuests=200,
        vendorCategory="Catering",
        currency=Currency.INR,
    )
    v_impact = simulate_scenario_endpoint(v_req)
    assert v_impact.overallRiskLevel == "high"


def test_plan_generate_fallback_resilience(sample_event_context):
    dummy_req = make_dummy_request()
    dummy_res = Response()
    plan = generate_plan_endpoint(dummy_req, dummy_res, sample_event_context)
    assert len(plan.budgetAllocations) > 0
    assert len(plan.vendorRecommendations) > 0
    assert len(plan.planningRecommendations) > 0
    assert len(plan.planSummary) > 10


def test_chat_endpoint(sample_event_context):
    dummy_req = make_dummy_request()
    dummy_res = Response()
    chat_req = ChatRequest(
        message="How do I allocate my budget for 250 guests?",
        eventContext=sample_event_context,
        conversationHistory=[],
    )
    chat_resp = chat_endpoint(dummy_req, dummy_res, chat_req)
    assert chat_resp.success is True
    assert len(chat_resp.message) > 10
    assert chat_resp.actionButtons is not None
