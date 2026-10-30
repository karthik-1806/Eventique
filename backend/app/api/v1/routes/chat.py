"""Chat endpoint."""

from fastapi import APIRouter, HTTPException, Request, Response
from app.core.config import settings
from app.core.security import RateLimiter, get_client_ip
from app.schemas.chat import ChatActionButton, ChatRequest, ChatResponse
from app.services.ai_cache import ai_cache
from app.services.gemini_service import gemini_service

router = APIRouter()
limiter = RateLimiter(max_requests=settings.RATE_LIMIT_CHAT, window_seconds=60)


@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: Request, response: Response, req: ChatRequest):
    client_ip = get_client_ip(request)
    is_allowed, remaining, retry_after = limiter.check(client_ip)

    response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_CHAT)
    response.headers["X-RateLimit-Remaining"] = str(remaining)

    if not is_allowed:
        response.headers["Retry-After"] = str(retry_after)
        raise HTTPException(
            status_code=429,
            detail=f"Chat rate limit exceeded. Retry after {retry_after} seconds.",
        )

    # Check cache for identical message + context
    cache_payload = {
        "message": req.message,
        "event": req.eventContext.model_dump(),
        "history_len": len(req.conversationHistory),
    }
    cache_key = ai_cache.generate_key("chat", cache_payload)
    cached_msg = ai_cache.get(cache_key)

    if cached_msg:
        response.headers["X-Cache"] = "HIT"
        return ChatResponse(success=True, message=cached_msg, cached=True)

    response.headers["X-Cache"] = "MISS"
    history_dicts = [{"role": m.role, "content": m.content} for m in req.conversationHistory]
    reply = gemini_service.generate_chat_response(req.message, req.eventContext, history_dicts)

    ai_cache.set(cache_key, reply)

    # Smart contextual action buttons
    action_buttons = []
    lower = req.message.lower()
    if "cut" in lower or "reduce" in lower or "save" in lower or "budget" in lower:
        action_buttons.append(
            ChatActionButton(label="Simulate 15% Budget Cut", action="OPEN_SCENARIO", data={"type": "budget_cut", "percent": 15})
        )
    elif "vendor" in lower or "photographer" in lower or "caterer" in lower:
        action_buttons.append(
            ChatActionButton(label="View Vendor Tracker", action="NAVIGATE_TAB", data={"tab": "vendors"})
        )
    elif "task" in lower or "timeline" in lower or "urgent" in lower:
        action_buttons.append(
            ChatActionButton(label="Review Critical Tasks", action="NAVIGATE_TAB", data={"tab": "tasks"})
        )

    return ChatResponse(
        success=True,
        message=reply,
        cached=False,
        actionButtons=action_buttons if action_buttons else None,
    )

