"""Pytest fixtures and configuration."""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.models.enums import Currency, EventType
from app.schemas.event import EventContext, EventProfile


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_wedding_event():
    return EventProfile(
        id="test-wedding-1",
        type=EventType.WEDDING,
        name="Ananya & Rohan's Wedding",
        date="2026-12-15",
        location="Udaipur, Rajasthan",
        guestCount=250,
        totalBudget=1000000.0,
        currency=Currency.INR,
        style="Royal Traditional",
        priorities=["Catering", "Photography", "Guest Comfort"],
    )


@pytest.fixture
def sample_event_context():
    return EventContext(
        eventType=EventType.WEDDING,
        eventName="Ananya & Rohan's Wedding",
        date="2026-12-15",
        location="Udaipur, Rajasthan",
        guestCount=250,
        totalBudget=1000000.0,
        currency=Currency.INR,
        style="Royal Traditional",
        priorities=["Catering", "Photography"],
        daysUntilEvent=90,
    )
