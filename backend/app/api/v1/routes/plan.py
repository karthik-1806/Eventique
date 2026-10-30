"""Plan generation endpoint."""

from fastapi import APIRouter, HTTPException, Request, Response
from app.core.config import settings
from app.core.security import RateLimiter, get_client_ip
from app.schemas.event import EventContext
from app.schemas.plan import PlanGenerationResponse
from app.services.ai_cache import ai_cache
from app.services.gemini_service import gemini_service

router = APIRouter()
limiter = RateLimiter(max_requests=settings.RATE_LIMIT_PLAN, window_seconds=60)


@router.post("/plan/generate", response_model=PlanGenerationResponse)
def generate_plan_endpoint(request: Request, response: Response, ctx: EventContext):
    client_ip = get_client_ip(request)
    is_allowed, remaining, retry_after = limiter.check(client_ip)

    response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_PLAN)
    response.headers["X-RateLimit-Remaining"] = str(remaining)

    if not is_allowed:
        response.headers["Retry-After"] = str(retry_after)
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for plan generation. Retry after {retry_after} seconds.",
        )

    cache_key = ai_cache.generate_key("plan", ctx.model_dump())
    cached_response = ai_cache.get(cache_key)
    if cached_response:
        response.headers["X-Cache"] = "HIT"
        return PlanGenerationResponse(**cached_response)

    response.headers["X-Cache"] = "MISS"
    result = gemini_service.generate_plan(ctx)
    ai_cache.set(cache_key, result.model_dump())
    return result

