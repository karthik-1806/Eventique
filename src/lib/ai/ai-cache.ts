// ============================================================
// EFFICIENCY: In-Memory TTL Cache for AI Responses
// Drastically improves latency, prevents token waste, and handles demand spikes
// ============================================================

import crypto from 'crypto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const MAX_CACHE_SIZE = 250;
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function generateCacheKey(prefix: string, payload: unknown): string {
  const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update(jsonStr).digest('hex').slice(0, 24);
  return `${prefix}:${hash}`;
}

export function getCachedAIResponse<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  // Refresh access order (true LRU by moving to end of Map insertion order)
  cache.delete(key);
  cache.set(key, entry);

  return entry.data as T;
}

export function setCachedAIResponse<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  // True LRU cleanup: delete least recently accessed key if max size reached
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  // If key already exists, delete first to refresh insertion order
  if (cache.has(key)) {
    cache.delete(key);
  }

  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearAICache(): void {
  cache.clear();
}
