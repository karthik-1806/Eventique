"""Health check endpoint."""

from fastapi import APIRouter
from app.core.config import settings
from app.services.gemini_service import gemini_service

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "aiConfigured": gemini_service.is_configured(),
        "defaultModel": settings.GEMINI_DEFAULT_MODEL,
        "supportedEventTypes": ["wedding", "birthday", "community"],
        "supportedCurrencies": ["INR", "USD", "EUR", "GBP"],
    }
