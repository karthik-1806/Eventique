// ============================================================
// GEMINI CLIENT — Server-side only. Never runs in browser.
// ============================================================

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  // In development, warn but don't throw (allows UI to load with mock data)
  console.warn('[AI] GEMINI_API_KEY not set. AI features will use fallback responses.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? 'placeholder');

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// Resilient fallback models if the primary model experiences high demand (503) or deprecation
const FALLBACK_MODELS = [
  DEFAULT_GEMINI_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
];

/**
 * Get the Gemini model instance.
 * Always use a server-side route — never expose in client components.
 */
export function getGeminiModel(modelName: string = DEFAULT_GEMINI_MODEL) {
  return genAI.getGenerativeModel({
    model: modelName,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 4096,
    },
  });
}

/**
 * Get a Gemini model configured for JSON output.
 */
export function getGeminiJSONModel(modelName: string = DEFAULT_GEMINI_MODEL) {
  return genAI.getGenerativeModel({
    model: modelName,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.4, // Lower temp for more consistent JSON
      topP: 0.85,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });
}

/**
 * Call Gemini with a prompt and return text.
 * Automatically tries fallback models if the primary model is busy or unavailable.
 */
export async function callGemini(prompt: string, useJSON: boolean = false): Promise<string> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'placeholder') {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const modelsToTry = Array.from(new Set([DEFAULT_GEMINI_MODEL, ...FALLBACK_MODELS]));
  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      const model = useJSON ? getGeminiJSONModel(modelName) : getGeminiModel(modelName);
      const result = await model.generateContent(prompt);
      const response = result.response;
      
      if (!response) {
        throw new Error('Empty response from Gemini');
      }

      const text = response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('Empty text response from Gemini');
      }

      return text;
    } catch (err) {
      lastError = err;
      console.warn(`[AI] Attempt with model "${modelName}" failed:`, err instanceof Error ? err.message : err);
      // Continue to next fallback model
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All Gemini model attempts failed');
}

/**
 * Parse JSON from Gemini response, with fallback.
 */
export function parseGeminiJSON<T>(text: string, fallback: T): T {
  try {
    // Strip markdown code blocks if present
    const cleaned = text
      .replace(/^```json\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.error('[AI] Failed to parse Gemini JSON response:', text.slice(0, 200));
    return fallback;
  }
}
