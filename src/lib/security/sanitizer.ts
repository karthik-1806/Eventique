// ============================================================
// SECURITY: Input Sanitization & Prompt Injection Defense
// Defends against delimiters, command hijacking, and stored XSS
// ============================================================

/**
 * Sanitizes user input before embedding into LLM prompt templates.
 * Enforces character stripping, delimiter isolation, and strict bounds.
 */
export function sanitizeForPrompt(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') return '';

  return text
    // Strip common prompt injection control delimiters
    .replace(/={3,}/g, '---')
    .replace(/-{4,}/g, '---')
    .replace(/[<>{}[\]]/g, '')
    // Disarm common role-override keywords at line starts
    .replace(/(^|\n)\s*(system|assistant|user|developer|instruction|override)\s*:/gi, '$1[sanitized]:')
    // Remove null bytes and non-printable control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse excessive consecutive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Truncate to safe length
    .slice(0, maxLength)
    .trim();
}

/**
 * Sanitizes strings for safe client-side display (HTML entity escaping).
 */
export function sanitizeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
