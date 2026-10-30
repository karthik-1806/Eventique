"""Application Configuration and Environment Settings."""

import os
from typing import List
from pydantic import BaseModel, Field


class Settings(BaseModel):
    PROJECT_NAME: str = "Eventique Planning Assistant"
    API_V1_STR: str = "/api/v1"
    GEMINI_API_KEY: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    GEMINI_DEFAULT_MODEL: str = Field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ]
    RATE_LIMIT_PLAN: int = 10  # req per min
    RATE_LIMIT_CHAT: int = 30  # req per min
    RATE_LIMIT_SCENARIO: int = 20  # req per min


settings = Settings()

