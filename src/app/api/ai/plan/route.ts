// ============================================================
// API ROUTE: /api/ai/plan — Generate full event plan
// Server-side only. API key never exposed to client.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGemini, parseGeminiJSON } from '@/lib/ai/gemini-client';
import { buildPlanGenerationPrompt } from '@/lib/ai/prompts';
import { validatePlanGenerationResponse } from '@/lib/ai/schemas';
import type { EventContext } from '@/lib/models/types';

// Input validation schema
const EventContextSchema = z.object({
  eventType: z.enum(['wedding', 'birthday', 'community']),
  eventName: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().min(1).max(300),
  guestCount: z.number().int().min(1).max(10000),
  totalBudget: z.number().min(1).max(1000000000),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
  style: z.string().max(500),
  priorities: z.array(z.string().max(100)).max(10),
  requirements: z.string().max(1000),
  daysUntilEvent: z.number(),
  currentBudgetCategories: z.array(z.object({
    name: z.string(),
    allocated: z.number(),
  })).optional(),
  currentVendors: z.array(z.object({
    category: z.string(),
    status: z.string(),
  })).optional(),
});

import { getClientIp, checkRateLimit, createRateLimitErrorResponse, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { generateCacheKey, getCachedAIResponse, setCachedAIResponse } from '@/lib/ai/ai-cache';

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const rateLimitResult = checkRateLimit('plan', ip, RATE_LIMITS.plan);
  if (!rateLimitResult.success) {
    return createRateLimitErrorResponse(rateLimitResult);
  }

  // Parse and validate input
  let ctx: EventContext;
  try {
    const body = await request.json();
    ctx = EventContextSchema.parse(body) as EventContext;
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request data', details: error instanceof Error ? error.message : 'Validation failed' },
      { status: 400 }
    );
  }

  // If API key is not configured, supply high-quality domain fallback plan
  if (!process.env.GEMINI_API_KEY) {
    const { DEFAULT_ALLOCATIONS } = await import('@/lib/engines/budget-engine');
    const allocations = DEFAULT_ALLOCATIONS[ctx.eventType] || DEFAULT_ALLOCATIONS.wedding;

    const fallbackData = {
      budgetAllocations: allocations.map((a) => ({
        name: a.name,
        percent: a.percent,
        reasoning: `Standard baseline for ${ctx.eventType} planning`,
      })),
      vendorRecommendations: [
        { category: 'Venue', priority: 'critical' as const, reasoning: 'Secure early to lock event date and capacity', estimatedCostRange: `${ctx.currency} ${Math.round(ctx.totalBudget * 0.25).toLocaleString()}` },
        { category: 'Catering', priority: 'critical' as const, reasoning: `Essential service for ${ctx.guestCount} guests`, estimatedCostRange: `${ctx.currency} ${Math.round(ctx.totalBudget * 0.25).toLocaleString()}` },
        { category: 'Photography & Video', priority: 'high' as const, reasoning: 'Capture essential event memories', estimatedCostRange: `${ctx.currency} ${Math.round(ctx.totalBudget * 0.1).toLocaleString()}` },
        { category: 'Entertainment', priority: 'high' as const, reasoning: 'Keeps guest engagement and atmosphere lively', estimatedCostRange: `${ctx.currency} ${Math.round(ctx.totalBudget * 0.08).toLocaleString()}` },
        { category: 'Decoration & Flowers', priority: 'medium' as const, reasoning: `Align with ${ctx.style || 'chosen theme'} aesthetic`, estimatedCostRange: `${ctx.currency} ${Math.round(ctx.totalBudget * 0.1).toLocaleString()}` },
        { category: 'Transportation', priority: 'medium' as const, reasoning: 'Guest logistics and arrival management', estimatedCostRange: `${ctx.currency} ${Math.round(ctx.totalBudget * 0.04).toLocaleString()}` },
      ],
      planningRecommendations: [
        {
          type: 'budget' as const,
          title: 'Maintain Contingency Reserve',
          explanation: `For an event with ${ctx.guestCount} attendees, unpredicted expenses commonly emerge in the final 30 days.`,
          impact: 'high' as const,
          priority: 'high' as const,
          suggestedAction: 'Keep at least 5% untouched in your reserve fund.',
        },
        {
          type: 'vendor' as const,
          title: 'Lock High-Demand Vendors Early',
          explanation: `With ${ctx.daysUntilEvent} days remaining, premier catering and photography vendors in ${ctx.location || 'your area'} book out quickly.`,
          impact: 'high' as const,
          priority: 'urgent' as const,
          suggestedAction: 'Send inquiries to top 3 vendor choices this week.',
        },
        {
          type: 'timeline' as const,
          title: 'Finalize RSVP Deadline 4 Weeks Out',
          explanation: 'Caterers require final headcount confirmation 14-21 days before the event.',
          impact: 'medium' as const,
          priority: 'medium' as const,
          suggestedAction: 'Set RSVP deadline on invitations accordingly.',
        },
        {
          type: 'idea' as const,
          title: 'Focus Budget on Top Priorities',
          explanation: `Focus extra visual polish on "${ctx.priorities.slice(0, 2).join(' and ') || 'Guest Experience'}" to maximize impact.`,
          impact: 'medium' as const,
          priority: 'medium' as const,
          suggestedAction: 'Align decor accents with your chosen priority list.',
        },
      ],
      riskWarnings: [
        {
          type: 'risk' as const,
          title: 'Guest Count Scalability',
          explanation: `A 15% increase in guest count adds direct per-head catering and seating costs.`,
          impact: 'high' as const,
          priority: 'high' as const,
          suggestedAction: 'Use the Scenarios tab to model headcount increases before expanding your guest list.',
        },
      ],
      planSummary: `Structured plan initialized for ${ctx.eventName}. Budget allocations and milestones have been calibrated for ${ctx.guestCount} guests, prioritizing core vendor categories.`,
    };

    return NextResponse.json({ success: true, data: fallbackData });
  }

  const cacheKey = generateCacheKey('plan', ctx);
  const cached = getCachedAIResponse<ReturnType<typeof validatePlanGenerationResponse>>(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached, cached: true });
  }

  try {
    const prompt = buildPlanGenerationPrompt(ctx);
    const rawResponse = await callGemini(prompt, true);
    const parsed = parseGeminiJSON(rawResponse, null);
    
    if (!parsed) {
      return NextResponse.json(
        { error: 'AI returned an unparseable response. Please try again.' },
        { status: 502 }
      );
    }

    const validated = validatePlanGenerationResponse(parsed);
    if (!validated) {
      return NextResponse.json(
        { error: 'AI response did not match expected format. Using default plan.' },
        { status: 502 }
      );
    }

    setCachedAIResponse(cacheKey, validated);
    return NextResponse.json({ success: true, data: validated });
  } catch (error) {
    console.error('[API /ai/plan] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'AI service temporarily unavailable. Your plan has been created with smart defaults.' },
      { status: 503 }
    );
  }
}
