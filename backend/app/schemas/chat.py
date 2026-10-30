"""Chat Schemas."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.event import EventContext


class ChatActionButton(BaseModel):
    label: str
    action: str
    data: Optional[Dict[str, Any]] = None


class ChatMessage(BaseModel):
    id: str
    role: str = Field(..., description="'user' | 'assistant'")
    content: str
    timestamp: str
    actionButtons: Optional[List[ChatActionButton]] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    eventContext: EventContext
    conversationHistory: List[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    success: bool = True
    message: str
    cached: Optional[bool] = False
    actionButtons: Optional[List[ChatActionButton]] = None

