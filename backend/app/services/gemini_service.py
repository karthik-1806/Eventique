"""Gemini AI Orchestration Service with model fallback, timeout, and deterministic fallback."""

import json
import logging
import re
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.core.security import sanitize_for_prompt
from app.models.enums import Currency, EventType, RecommendationImpact, RecommendationPriority, RecommendationType
from app.schemas.budget import BudgetAllocationSuggestion
from app.schemas.event import EventContext
from app.schemas.plan import PlanGenerationResponse, PlanningRecommendation, VendorRecommendation

logger = logging.getLogger(__name__)

FALLBACK_MODELS = [
    settings.GEMINI_DEFAULT_MODEL,
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self._client = None

    @property
    def client(self):
        """Lazy client initialization to prevent module-level blocking on network/sockets."""
        if self._client is None and self.api_key and self.api_key != "your_gemini_api_key_here":
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Google GenAI client: {e}")
        return self._client

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key != "your_gemini_api_key_here")

    def generate_plan(self, ctx: EventContext) -> PlanGenerationResponse:
        """Generates structured event plan with AI or deterministic fallback."""
        if not self.client:
            logger.info("Gemini API key not configured or client unavailable. Generating deterministic fallback plan.")
            return self._build_deterministic_fallback_plan(ctx)

        prompt = self._build_plan_prompt(ctx)

        # Attempt models with fallback
        for model in FALLBACK_MODELS:
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "temperature": 0.4,
                    },
                )
                if response and response.text:
                    cleaned_json = self._clean_json(response.text)
                    parsed = json.loads(cleaned_json)
                    return self._normalize_plan_response(parsed, ctx)
            except Exception as e:
                logger.warning(f"Gemini model {model} failed: {e}. Trying next...")

        logger.warning("All Gemini models failed. Serving deterministic fallback plan.")
        return self._build_deterministic_fallback_plan(ctx)

    def generate_chat_response(
        self,
        message: str,
        ctx: EventContext,
        history: List[Dict[str, str]],
    ) -> str:
        """Generates conversational guidance using event context."""
        if not self.client:
            return self._generate_fallback_chat(message, ctx)

        prompt = self._build_chat_prompt(message, ctx, history)

        for model in FALLBACK_MODELS:
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={"temperature": 0.7},
                )
                if response and response.text:
                    return response.text[:3000].strip()
            except Exception as e:
                logger.warning(f"Chat model {model} failed: {e}")

        return self._generate_fallback_chat(message, ctx)

    def _clean_json(self, raw_text: str) -> str:
        text = raw_text.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
        return text.strip()

    def _normalize_plan_response(self, data: Dict[str, Any], ctx: EventContext) -> PlanGenerationResponse:
        allocations_data = data.get("budgetAllocations", [])
        total_pct = sum(item.get("percent", 0.0) for item in allocations_data)

        # Proportional normalization to exactly 100%
        normalized_allocations: List[BudgetAllocationSuggestion] = []
        if total_pct > 0 and abs(total_pct - 100.0) > 0.01:
            scale = 100.0 / total_pct
            for item in allocations_data:
                normalized_allocations.append(
                    BudgetAllocationSuggestion(
                        name=sanitize_for_prompt(item.get("name", "Miscellaneous"), 100),
                        percent=round(item.get("percent", 0.0) * scale, 1),
                        reasoning=sanitize_for_prompt(item.get("reasoning", ""), 300),
                    )
                )
        else:
            for item in allocations_data:
                normalized_allocations.append(
                    BudgetAllocationSuggestion(
                        name=sanitize_for_prompt(item.get("name", "Miscellaneous"), 100),
                        percent=float(item.get("percent", 0.0)),
                        reasoning=sanitize_for_prompt(item.get("reasoning", ""), 300),
                    )
                )

        vendors = [
            VendorRecommendation(
                category=sanitize_for_prompt(v.get("category", "Vendor"), 100),
                priority=sanitize_for_prompt(v.get("priority", "medium"), 20),
                reasoning=sanitize_for_prompt(v.get("reasoning", ""), 400),
                estimatedCostRange=sanitize_for_prompt(v.get("estimatedCostRange", "Standard"), 100),
            )
            for v in data.get("vendorRecommendations", [])
        ]

        recs = [
            PlanningRecommendation(
                type=RecommendationType(r.get("type", "idea")),
                title=sanitize_for_prompt(r.get("title", "Recommendation"), 150),
                explanation=sanitize_for_prompt(r.get("explanation", ""), 800),
                impact=RecommendationImpact(r.get("impact", "medium")),
                priority=RecommendationPriority(r.get("priority", "medium")),
                suggestedAction=sanitize_for_prompt(r.get("suggestedAction", ""), 300),
            )
            for r in data.get("planningRecommendations", [])
        ]

        risks = [
            PlanningRecommendation(
                type=RecommendationType.RISK,
                title=sanitize_for_prompt(r.get("title", "Risk Consideration"), 150),
                explanation=sanitize_for_prompt(r.get("explanation", ""), 800),
                impact=RecommendationImpact(r.get("impact", "high")),
                priority=RecommendationPriority(r.get("priority", "urgent")),
                suggestedAction=sanitize_for_prompt(r.get("suggestedAction", ""), 300),
            )
            for r in data.get("riskWarnings", [])
        ]

        summary = sanitize_for_prompt(data.get("planSummary", f"Tailored planning strategy for {ctx.eventName}."), 500)

        return PlanGenerationResponse(
            budgetAllocations=normalized_allocations,
            vendorRecommendations=vendors,
            planningRecommendations=recs,
            riskWarnings=risks,
            planSummary=summary,
        )

    def _build_deterministic_fallback_plan(self, ctx: EventContext) -> PlanGenerationResponse:
        """High-fidelity contextual fallback plan when AI is offline."""
        is_inr = ctx.currency == Currency.INR
        curr_sym = "₹" if is_inr else "$"

        if ctx.eventType == EventType.WEDDING:
            allocs = [
                BudgetAllocationSuggestion(name="Venue", percent=30.0, reasoning="Core ceremony & banquet spaces"),
                BudgetAllocationSuggestion(name="Catering", percent=25.0, reasoning=f"Multi-course menu for {ctx.guestCount} guests"),
                BudgetAllocationSuggestion(name="Photography & Video", percent=10.0, reasoning="Full day cinematic & drone coverage"),
                BudgetAllocationSuggestion(name="Decoration & Flowers", percent=10.0, reasoning="Mandap/stage floral arrangements"),
                BudgetAllocationSuggestion(name="Entertainment & Music", percent=7.0, reasoning="Live acoustic & DJ setup"),
                BudgetAllocationSuggestion(name="Wedding Attire", percent=5.0, reasoning="Ceremony outfits & styling"),
                BudgetAllocationSuggestion(name="Invitations & Stationery", percent=2.0, reasoning="Digital & physical invitation suite"),
                BudgetAllocationSuggestion(name="Transportation", percent=3.0, reasoning="Guest shuttles and bridal transport"),
                BudgetAllocationSuggestion(name="Accommodation", percent=3.0, reasoning="VIP family room block reserve"),
                BudgetAllocationSuggestion(name="Miscellaneous", percent=3.0, reasoning="Incidental supplies & tips"),
                BudgetAllocationSuggestion(name="Contingency", percent=2.0, reasoning="Buffer for price adjustments"),
            ]
            vendors = [
                VendorRecommendation(category="Venue", priority="critical", reasoning="Lock booking date immediately", estimatedCostRange=f"{curr_sym}{int(ctx.totalBudget * 0.3):,}"),
                VendorRecommendation(category="Catering", priority="critical", reasoning=f"Tasting and menu finalization for {ctx.guestCount} pax", estimatedCostRange=f"{curr_sym}{int(ctx.totalBudget * 0.25):,}"),
                VendorRecommendation(category="Photography", priority="high", reasoning="Book lead photographer with outdoor experience", estimatedCostRange=f"{curr_sym}{int(ctx.totalBudget * 0.1):,}"),
            ]
            recs = [
                PlanningRecommendation(
                    type=RecommendationType.TIMELINE,
                    title="Lock Primary Venue Contract",
                    explanation=f"With {ctx.daysUntilEvent} days remaining in {ctx.location}, top venues experience high demand.",
                    impact=RecommendationImpact.HIGH,
                    priority=RecommendationPriority.URGENT,
                    suggestedAction="Schedule in-person walkthrough and secure date with deposit.",
                ),
                PlanningRecommendation(
                    type=RecommendationType.BUDGET,
                    title="Catering Headcount Buffer",
                    explanation=f"At {ctx.guestCount} attendees, per-plate pricing significantly dictates financial flexibility.",
                    impact=RecommendationImpact.HIGH,
                    priority=RecommendationPriority.HIGH,
                    suggestedAction="Negotiate per-head tier brackets and confirm service tax inclusions.",
                ),
            ]
            risks = [
                PlanningRecommendation(
                    type=RecommendationType.RISK,
                    title="Weather Contingency for Outdoor Elements",
                    explanation="Weather shifts can jeopardize uncovered guest areas and delicate AV equipment.",
                    impact=RecommendationImpact.HIGH,
                    priority=RecommendationPriority.HIGH,
                    suggestedAction="Confirm retractable canopies or reserve an indoor backup hall.",
                )
            ]
        elif ctx.eventType == EventType.BIRTHDAY:
            allocs = [
                BudgetAllocationSuggestion(name="Venue", percent=25.0, reasoning="Party hall / clubhouse rental"),
                BudgetAllocationSuggestion(name="Catering & Cake", percent=30.0, reasoning="Custom designer cake and finger foods"),
                BudgetAllocationSuggestion(name="Decoration", percent=15.0, reasoning="Themed backdrop and balloon arches"),
                BudgetAllocationSuggestion(name="Entertainment", percent=15.0, reasoning="Games host, magician, or DJ"),
                BudgetAllocationSuggestion(name="Photography", percent=8.0, reasoning="Candid party photography"),
                BudgetAllocationSuggestion(name="Invitations", percent=2.0, reasoning="Digital RSVP cards"),
                BudgetAllocationSuggestion(name="Transportation", percent=2.0, reasoning="Cake delivery & material transport"),
                BudgetAllocationSuggestion(name="Miscellaneous", percent=2.0, reasoning="Party favors and game prizes"),
                BudgetAllocationSuggestion(name="Contingency", percent=1.0, reasoning="Last minute guest RSVPs"),
            ]
            vendors = [
                VendorRecommendation(category="Cake & Bakery", priority="high", reasoning="Order custom tier cake 10 days in advance", estimatedCostRange=f"{curr_sym}{int(ctx.totalBudget * 0.08):,}"),
                VendorRecommendation(category="Entertainment Host", priority="high", reasoning="Engage dedicated emcee for party games", estimatedCostRange=f"{curr_sym}{int(ctx.totalBudget * 0.15):,}"),
            ]
            recs = [
                PlanningRecommendation(
                    type=RecommendationType.PERSONALIZATION,
                    title="Custom Themed Activity Stations",
                    explanation=f"Creating dedicated stations for {ctx.guestCount} guests keeps energy lively throughout.",
                    impact=RecommendationImpact.MEDIUM,
                    priority=RecommendationPriority.MEDIUM,
                    suggestedAction="Coordinate themed photo booth props and interactive games.",
                )
            ]
            risks = []
        else:  # Community event
            allocs = [
                BudgetAllocationSuggestion(name="Venue", percent=20.0, reasoning="Public park / community hall permit"),
                BudgetAllocationSuggestion(name="Catering", percent=30.0, reasoning="Refreshments / food stalls for attendees"),
                BudgetAllocationSuggestion(name="Audio/Visual Equipment", percent=12.0, reasoning="Public address sound system & stage"),
                BudgetAllocationSuggestion(name="Decoration & Signage", percent=8.0, reasoning="Wayfinding banners & directional signs"),
                BudgetAllocationSuggestion(name="Security", percent=5.0, reasoning="Crowd management & first aid crew"),
                BudgetAllocationSuggestion(name="Transportation", percent=5.0, reasoning="Equipment logistics & parking marshals"),
                BudgetAllocationSuggestion(name="Marketing & Invitations", percent=7.0, reasoning="Community flyers, banners, social ads"),
                BudgetAllocationSuggestion(name="Permits & Insurance", percent=5.0, reasoning="Municipal, noise, and event safety permits"),
                BudgetAllocationSuggestion(name="Volunteers & Staff", percent=5.0, reasoning="Staff t-shirts, walkie-talkies & meals"),
                BudgetAllocationSuggestion(name="Miscellaneous", percent=2.0, reasoning="Waste disposal & cleanup supplies"),
                BudgetAllocationSuggestion(name="Contingency", percent=1.0, reasoning="Unexpected logistical requirements"),
            ]
            vendors = [
                VendorRecommendation(category="Audio/Visual & Sound", priority="critical", reasoning="Outdoor PA system with wireless mics", estimatedCostRange=f"{curr_sym}{int(ctx.totalBudget * 0.12):,}"),
                VendorRecommendation(category="Municipal Authority", priority="critical", reasoning="Liaison for noise & gathering clearances", estimatedCostRange=f"{curr_sym}{int(ctx.totalBudget * 0.05):,}"),
            ]
            recs = [
                PlanningRecommendation(
                    type=RecommendationType.TIMELINE,
                    title="Expedite Municipal Permits",
                    explanation=f"Public community gatherings for {ctx.guestCount} attendees require safety clearances.",
                    impact=RecommendationImpact.HIGH,
                    priority=RecommendationPriority.URGENT,
                    suggestedAction="Submit sound and venue permits at least 3 weeks prior.",
                )
            ]
            risks = [
                PlanningRecommendation(
                    type=RecommendationType.RISK,
                    title="Crowd Safety & Parking Logistics",
                    explanation=f"A gathering of {ctx.guestCount} requires dedicated entry/exit lanes and medical kits.",
                    impact=RecommendationImpact.HIGH,
                    priority=RecommendationPriority.HIGH,
                    suggestedAction="Assign designated parking marshals and mark first-aid points.",
                )
            ]

        return PlanGenerationResponse(
            budgetAllocations=allocs,
            vendorRecommendations=vendors,
            planningRecommendations=recs,
            riskWarnings=risks,
            planSummary=f"Deterministic high-fidelity planning framework optimized for a {ctx.eventType} in {ctx.location} with {ctx.guestCount} attendees.",
        )

    def _generate_fallback_chat(self, user_msg: str, ctx: EventContext) -> str:
        lower = user_msg.lower()
        if "budget" in lower or "cost" in lower or "money" in lower:
            return (
                f"For your {ctx.eventType} with a total budget of {ctx.currency} {ctx.totalBudget:,.0f}, "
                f"your top allocation goes toward Venue and Catering. "
                f"Review your What-if simulator to model spending cuts without jeopardizing core contracts."
            )
        if "vendor" in lower or "caterer" in lower or "photographer" in lower:
            return (
                f"With {ctx.daysUntilEvent} days until your event in {ctx.location}, "
                f"securing your critical vendors (Venue, Catering, AV/Photography) should be your top priority. "
                f"Check the Vendor Tracker tab to update inquiry statuses."
            )
        if "timeline" in lower or "task" in lower or "schedule" in lower:
            return (
                f"Your timeline is actively tracking key milestones for {ctx.guestCount} attendees. "
                f"Focus on items labeled CRITICAL in your Tasks panel to stay ahead of schedule."
            )
        return (
            f"I am your AI event planning assistant for **{ctx.eventName}**. "
            f"I have direct visibility into your {ctx.guestCount} attendee profile, "
            f"budget of {ctx.currency} {ctx.totalBudget:,.0f}, and {ctx.daysUntilEvent} days remaining lead time. "
            f"How can I assist your planning today?"
        )

    def _build_plan_prompt(self, ctx: EventContext) -> str:
        return f"""You are a master event planning strategist. Generate an optimal plan for:
Event: {sanitize_for_prompt(ctx.eventName)} ({ctx.eventType})
Date: {ctx.date} ({ctx.daysUntilEvent} days away)
Location: {sanitize_for_prompt(ctx.location)}
Guests: {ctx.guestCount}
Budget: {ctx.currency} {ctx.totalBudget:,.0f}
Style: {sanitize_for_prompt(ctx.style or 'Standard')}
Priorities: {', '.join(sanitize_for_prompt(p) for p in ctx.priorities)}

Return JSON matching this exact structure:
{{
  "budgetAllocations": [{{"name": "string", "percent": number, "reasoning": "string"}}],
  "vendorRecommendations": [{{"category": "string", "priority": "critical|high|medium", "reasoning": "string", "estimatedCostRange": "string"}}],
  "planningRecommendations": [{{"type": "budget|timeline|vendor|personalization|idea", "title": "string", "explanation": "string", "impact": "high|medium|low", "priority": "urgent|high|medium|low", "suggestedAction": "string"}}],
  "riskWarnings": [{{"type": "risk", "title": "string", "explanation": "string", "impact": "high|medium", "priority": "urgent|high", "suggestedAction": "string"}}],
  "planSummary": "string (50-200 words)"
}}
Ensure all budget allocation percentages sum to 100%. Keep advice realistic for the locale and guest count."""

    def _build_chat_prompt(self, message: str, ctx: EventContext, history: List[Dict[str, str]]) -> str:
        history_text = "\n".join(
            f"{sanitize_for_prompt(h.get('role', 'user'))}: {sanitize_for_prompt(h.get('content', ''))}"
            for h in history[-6:]
        )
        return f"""You are an expert event planning consultant helping with a {ctx.eventType}.
Event Details:
- Name: {sanitize_for_prompt(ctx.eventName)}
- Guests: {ctx.guestCount}
- Budget: {ctx.currency} {ctx.totalBudget:,.0f}
- Location: {sanitize_for_prompt(ctx.location)}
- Days remaining: {ctx.daysUntilEvent}

Conversation History:
{history_text or 'No prior history.'}

User Question: "{sanitize_for_prompt(message)}"

Provide thoughtful, actionable advice (2-4 concise paragraphs). Do not perform arithmetic; refer user to their budget/timeline tools for exact figures."""


gemini_service = GeminiService()

