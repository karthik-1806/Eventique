// ============================================================
// API ROUTE: /api/ai/scenario — What-if scenario AI explanation
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGemini } from '@/lib/ai/gemini-client';
import { buildScenarioExplanationPrompt } from '@/lib/ai/prompts';

const ScenarioRequestSchema = z.object({
  eventContext: z.object({
    eventType: z.enum(['wedding', 'birthday', 'community']),
    eventName: z.string().max(200),
    date: z.string(),
    location: z.string().max(300),
    guestCount: z.number(),
    totalBudget: z.number(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
    style: z.string().max(500),
    priorities: z.array(z.string()).max(10),
    requirements: z.string().max(500),
    daysUntilEvent: z.number(),
  }),
  scenarioName: z.string().max(200),
  changes: z.array(z.object({
    field: z.string(),
    from: z.union([z.string(), z.number()]),
    to: z.union([z.string(), z.number()]),
  })).max(5),
  calculatedImpact: z.object({
    financialDelta: z.number(),
    affectedCategories: z.array(z.string()),
    riskLevel: z.string(),
  }),
});

import { getClientIp, checkRateLimit, createRateLimitErrorResponse, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { generateCacheKey, getCachedAIResponse, setCachedAIResponse } from '@/lib/ai/ai-cache';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = checkRateLimit('scenario', ip, RATE_LIMITS.scenario);
  if (!rateLimitResult.success) {
    return createRateLimitErrorResponse(rateLimitResult);
  }

  let body: z.infer<typeof ScenarioRequestSchema>;
  try {
    const raw = await request.json();
    body = ScenarioRequestSchema.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Fallback explanation if API key is not set
  if (!process.env.GEMINI_API_KEY) {
    const sign = body.calculatedImpact.financialDelta > 0 ? '+' : '';
    const formattedDelta = `${sign}${body.eventContext.currency} ${body.calculatedImpact.financialDelta.toLocaleString()}`;
    const categoriesList = body.calculatedImpact.affectedCategories.slice(0, 3).join(', ') || 'discretionary items';
    
    const explanation = `Scenario "${body.scenarioName}" models a net shift of ${formattedDelta}. Under a ${body.calculatedImpact.riskLevel}-risk assessment, adjustments are distributed primarily across ${categoriesList}. We recommend locking vendor quotes early and preserving essential attendee experience categories before committing to reductions.`;

    return NextResponse.json({ success: true, explanation });
  }

  try {
    const prompt = buildScenarioExplanationPrompt(
      body.eventContext as Parameters<typeof buildScenarioExplanationPrompt>[0],
      body.scenarioName,
      body.changes,
      body.calculatedImpact,
    );

    const cacheKey = generateCacheKey('scenario', { prompt });
    const cached = getCachedAIResponse<string>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, explanation: cached, cached: true });
    }
    
    const explanation = await callGemini(prompt, false);
    const sanitized = explanation.slice(0, 1000).trim();
    setCachedAIResponse(cacheKey, sanitized);

    return NextResponse.json({ success: true, explanation: sanitized });
  } catch (error) {
    console.error('[API /ai/scenario] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Could not generate scenario explanation.' },
      { status: 503 }
    );
  }
}
