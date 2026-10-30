"""API v1 Router Aggregator."""

from fastapi import APIRouter
from app.api.v1.routes import budget, chat, health, plan, scenario, timeline

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(plan.router, tags=["Planning"])
api_router.include_router(budget.router, tags=["Budget Engine"])
api_router.include_router(timeline.router, tags=["Timeline Engine"])
api_router.include_router(scenario.router, tags=["Scenario Simulator"])
api_router.include_router(chat.router, tags=["AI Chat Assistant"])

