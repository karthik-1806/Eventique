// ============================================================
// SECURITY: In-Memory Sliding Window Rate Limiter
// Prevents API abuse, DoS, and LLM quota exhaustion
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface ClientRecord {
  count: number;
  resetAt: number;
}

const clientMaps = new Map<string, Map<string, ClientRecord>>();
const MAX_MAP_SIZE = 500;

export function resetRateLimiter(): void {
  clientMaps.clear();
}

/**
 * Prunes expired records from a route's client map to prevent unbounded memory leaks
 */
function pruneExpiredRecords(routeMap: Map<string, ClientRecord>, now: number): void {
  for (const [ip, record] of routeMap.entries()) {
    if (now > record.resetAt) {
      routeMap.delete(ip);
    }
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first valid IP from the comma-separated proxy chain
    const parts = forwarded.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      // Basic IPv4 / IPv6 validation regex to avoid spoofed malformed headers
      if (/^(?:\d{1,3}\.){3}\d{1,3}$|^[a-fA-F0-9:]+$/.test(trimmed)) {
        return trimmed;
      }
    }
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp && /^(?:\d{1,3}\.){3}\d{1,3}$|^[a-fA-F0-9:]+$/.test(realIp.trim())) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  routeKey: string,
  clientIp: string,
  config: RateLimitConfig
): RateLimitResult {
  let routeMap = clientMaps.get(routeKey);
  if (!routeMap) {
    routeMap = new Map<string, ClientRecord>();
    clientMaps.set(routeKey, routeMap);
  }

  const now = Date.now();

  // Prune expired records periodically if the map grows
  if (routeMap.size > MAX_MAP_SIZE) {
    pruneExpiredRecords(routeMap, now);
  }

  const record = routeMap.get(clientIp);

  if (!record || now > record.resetAt) {
    const resetAt = now + config.windowMs;
    routeMap.set(clientIp, { count: 1, resetAt });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (record.count >= config.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfterSeconds,
    };
  }

  record.count++;
  return {
    success: true,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - record.count),
    resetAt: record.resetAt,
    retryAfterSeconds: 0,
  };
}

export function createRateLimitErrorResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded. Please wait before submitting another request.',
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': result.retryAfterSeconds.toString(),
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
      },
    }
  );
}

// Preset configurations
export const RATE_LIMITS = {
  plan: { maxRequests: 10, windowMs: 60 * 1000 },      // 10 plans per min
  chat: { maxRequests: 30, windowMs: 60 * 1000 },      // 30 chat messages per min
  scenario: { maxRequests: 20, windowMs: 60 * 1000 },  // 20 scenarios per min
};
