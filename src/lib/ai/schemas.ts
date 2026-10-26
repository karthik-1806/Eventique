// ============================================================
// AI OUTPUT SCHEMAS — Zod validation for all AI responses
// ============================================================

import { z } from 'zod';

// ---- Recommendation ----
export const RecommendationSchema = z.object({
  type: z.enum(['budget', 'timeline', 'vendor', 'risk', 'personalization', 'idea']),
  title: z.string().min(1).max(200),
  explanation: z.string().min(10).max(1000),
  impact: z.enum(['high', 'medium', 'low']),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  suggestedAction: z.string().min(1).max(500),
});

// ---- Budget Allocation ----
export const BudgetAllocationSchema = z.object({
  name: z.string().min(1).max(100),
  percent: z.number().min(0).max(100),
  reasoning: z.string().max(500),
});

// ---- Vendor Recommendation ----
export const VendorRecommendationSchema = z.object({
  category: z.string().min(1).max(100),
  priority: z.enum(['critical', 'high', 'medium']),
  reasoning: z.string().max(500),
  estimatedCostRange: z.string().max(100),
});

// ---- Full Plan Generation Response ----
export const PlanGenerationResponseSchema = z.object({
  budgetAllocations: z.array(BudgetAllocationSchema).min(1).max(15),
  vendorRecommendations: z.array(VendorRecommendationSchema).min(1).max(10),
  planningRecommendations: z.array(RecommendationSchema).min(1).max(10),
  riskWarnings: z.array(RecommendationSchema).min(0).max(5),
  planSummary: z.string().min(10).max(500),
});

// ---- Recommendations Refresh Response ----
export const RecommendationsRefreshResponseSchema = z.object({
  recommendations: z.array(RecommendationSchema).min(1).max(8),
});

export type PlanGenerationResponse = z.infer<typeof PlanGenerationResponseSchema>;
export type RecommendationsRefreshResponse = z.infer<typeof RecommendationsRefreshResponseSchema>;
export type RecommendationOutput = z.infer<typeof RecommendationSchema>;

/**
 * Validate AI plan generation output.
 * Returns validated data or null if validation fails.
 */
export function validatePlanGenerationResponse(data: unknown): PlanGenerationResponse | null {
  const result = PlanGenerationResponseSchema.safeParse(data);
  if (!result.success) {
    console.error('[AI Schema] Plan generation validation failed:', result.error.flatten());
    return null;
  }
  // Normalize budget allocations to sum exactly to 100%
  const total = result.data.budgetAllocations.reduce((sum, a) => sum + a.percent, 0);
  if (total > 0 && Math.abs(total - 100) > 0.1) {
    console.warn('[AI Schema] Budget allocations sum to', total, '% — normalizing to 100%');
    const factor = 100 / total;
    result.data.budgetAllocations = result.data.budgetAllocations.map((a) => ({
      ...a,
      percent: Math.round(a.percent * factor * 10) / 10,
    }));
  }
  return result.data;
}

/**
 * Validate AI recommendations refresh output.
 */
export function validateRecommendationsResponse(data: unknown): RecommendationsRefreshResponse | null {
  const result = RecommendationsRefreshResponseSchema.safeParse(data);
  if (!result.success) {
    console.error('[AI Schema] Recommendations validation failed:', result.error.flatten());
    return null;
  }
  return result.data;
}
