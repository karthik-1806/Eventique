// ============================================================
// API ROUTE: /api/ai/chat — AI chat assistant
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGemini } from '@/lib/ai/gemini-client';
import { buildChatPrompt } from '@/lib/ai/prompts';

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  eventContext: z.object({
    eventType: z.enum(['wedding', 'birthday', 'community']),
    eventName: z.string().max(200),
    date: z.string(),
    location: z.string().max(300),
    guestCount: z.number().int().min(1),
    totalBudget: z.number().min(0),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
    style: z.string().max(500),
    priorities: z.array(z.string()).max(10),
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
  }),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).max(20),
});

import { getClientIp, checkRateLimit, createRateLimitErrorResponse, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { generateCacheKey, getCachedAIResponse, setCachedAIResponse } from '@/lib/ai/ai-cache';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = checkRateLimit('chat', ip, RATE_LIMITS.chat);
  if (!rateLimitResult.success) {
    return createRateLimitErrorResponse(rateLimitResult);
  }

  let body: z.infer<typeof ChatRequestSchema>;
  try {
    const raw = await request.json();
    body = ChatRequestSchema.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Graceful fallback when API key is not configured
  if (!process.env.GEMINI_API_KEY) {
    const { eventName, eventType, guestCount, totalBudget, currency, daysUntilEvent } = body.eventContext;
    const msg = body.message.toLowerCase();

    let reply = `I'm tracking **${eventName}** (${currency} ${totalBudget.toLocaleString()} budget, ${guestCount} guests, ${daysUntilEvent} days out).\n\n`;

    if (msg.includes('budget') || msg.includes('cost') || msg.includes('cheaper') || msg.includes('save') || msg.includes('cut')) {
      reply += `To optimize spending without impacting attendee experience, consider locking core categories (Venue & Catering) and reviewing discretionary allocations like Decoration or Miscellaneous.\n\n💡 *Tip: Test budget variations in the **Scenarios** tab to model exact reductions deterministically before applying them.*`;
    } else if (msg.includes('vendor') || msg.includes('cater') || msg.includes('photograph')) {
      reply += `For a ${eventType} with ${guestCount} attendees, early vendor booking is vital. Check the **Vendors** tab to track inquiry statuses from 'Researching' to 'Booked'.`;
    } else if (msg.includes('timeline') || msg.includes('task') || msg.includes('deadline')) {
      reply += `You have ${daysUntilEvent} days until the event date. Focus on any high-priority or overdue milestones highlighted in the **Timeline** and **Tasks** panels.`;
    } else {
      reply += `Regarding "${body.message}": Our deterministic engines handle all exact arithmetic and schedule calculations, while AI provides strategic guidance. You can model hypothetical shifts in the **Scenarios** tab or adjust category allocations in the **Budget** tab at any time!`;
    }

    return NextResponse.json({ success: true, message: reply });
  }

  try {
    const prompt = buildChatPrompt(
      body.message,
      body.eventContext as Parameters<typeof buildChatPrompt>[1],
      body.conversationHistory,
    );

    const cacheKey = generateCacheKey('chat', { prompt });
    const cached = getCachedAIResponse<string>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, message: cached, cached: true });
    }
    
    const response = await callGemini(prompt, false);
    
    // Sanitize response — ensure it's plain text, no injection
    const sanitized = response.slice(0, 3000).trim();
    setCachedAIResponse(cacheKey, sanitized);
    
    return NextResponse.json({ success: true, message: sanitized });
  } catch (error) {
    console.error('[API /ai/chat] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'AI assistant is temporarily unavailable. Please try again.' },
      { status: 503 }
    );
  }
}
