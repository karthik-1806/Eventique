/**
 * FastAPI Client Bridge
 * 
 * Provides an optional, resilient proxy bridge between Next.js server routes and
 * the Python FastAPI backend (http://127.0.0.1:8000).
 * 
 * Architecture:
 * If the FastAPI backend is running, calls route through FastAPI's Pydantic-validated
 * domain engines and Gemini AI orchestrator. If unreachable or disabled, it cleanly
 * falls back to Next.js in-process deterministic engines.
 */

const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000';
const TIMEOUT_MS = Number(process.env.FASTAPI_TIMEOUT_MS) || 3000;

export async function callFastAPI<T>(endpoint: string, data: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${FASTAPI_URL}/api/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, error: `FastAPI responded with HTTP ${response.status}` };
    }

    const json = await response.json();
    return { success: true, data: json };
  } catch (err) {
    // Graceful fallback — FastAPI not active or timed out
    return {
      success: false,
      error: err instanceof Error ? err.message : 'FastAPI unavailable',
    };
  }
}

export async function checkFastAPIHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${FASTAPI_URL}/api/v1/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

