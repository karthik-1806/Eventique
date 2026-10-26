// ============================================================
// TEST SUITE: AI Schema Validation & Resiliency Tests
// Verifies Zod parsing, boundary enforcement, and normalization
// ============================================================

import {
  validatePlanGenerationResponse,
  validateRecommendationsResponse,
  RecommendationSchema,
} from './schemas';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Schema Test Failure]: ${message}`);
  }
}

console.log('--- RUNNING AI SCHEMA & VALIDATION TESTS ---');

// Test 1: Valid Plan Generation Response
console.log('Testing valid plan response validation...');
const validPlan = {
  budgetAllocations: [
    { name: 'Venue', percent: 30, reasoning: 'Prime location' },
    { name: 'Catering', percent: 30, reasoning: 'Gourmet meal' },
    { name: 'Photography', percent: 20, reasoning: 'Memories' },
    { name: 'Decor', percent: 20, reasoning: 'Floral arrangements' },
  ],
  vendorRecommendations: [
    { category: 'Venue', priority: 'critical', reasoning: 'Book early', estimatedCostRange: '$5,000' },
    { category: 'Catering', priority: 'critical', reasoning: 'Headcount', estimatedCostRange: '$5,000' },
  ],
  planningRecommendations: [
    {
      type: 'budget',
      title: 'Maintain reserve',
      explanation: 'Unplanned expenses happen in final days',
      impact: 'high',
      priority: 'high',
      suggestedAction: 'Keep 5% reserve',
    },
  ],
  riskWarnings: [
    {
      type: 'risk',
      title: 'Weather risk',
      explanation: 'Outdoor ceremony requires rain backup plan',
      impact: 'high',
      priority: 'urgent',
      suggestedAction: 'Reserve marquee tent',
    },
  ],
  planSummary: 'Structured plan optimized for guest experience and budget adherence.',
};

const validated = validatePlanGenerationResponse(validPlan);
assert(validated !== null, 'Valid plan response should parse successfully');
assert(validated!.budgetAllocations.length === 4, 'Should contain 4 allocations');

// Test 2: Budget Allocation Normalization (Summing to 104% -> should normalize)
console.log('Testing budget percentage normalization...');
const unnormalizedPlan = {
  ...validPlan,
  budgetAllocations: [
    { name: 'Venue', percent: 32, reasoning: 'A' },
    { name: 'Catering', percent: 32, reasoning: 'B' },
    { name: 'Photography', percent: 20, reasoning: 'C' },
    { name: 'Decor', percent: 20, reasoning: 'D' }, // Total = 104%
  ],
};
const normalized = validatePlanGenerationResponse(unnormalizedPlan);
assert(normalized !== null, 'Unnormalized plan should be normalized rather than discarded');
const normalizedSum = normalized!.budgetAllocations.reduce((sum, a) => sum + a.percent, 0);
assert(Math.abs(normalizedSum - 100) < 1, `Normalized sum ${normalizedSum} should be within 1% of 100%`);

// Test 3: Invalid Schema Rejection
console.log('Testing invalid payload rejection...');
const invalidPlan = {
  budgetAllocations: [], // min(1) violation
  vendorRecommendations: [],
  planningRecommendations: [],
  planSummary: 'Short', // min(10) violation
};
const rejected = validatePlanGenerationResponse(invalidPlan);
assert(rejected === null, 'Invalid plan payload must return null');

// Test 4: Recommendation Schema Boundary Validation
console.log('Testing recommendation schema boundaries...');
const validRec = {
  type: 'vendor',
  title: 'Lock Photographer Early',
  explanation: 'High demand professionals book 6 months in advance',
  impact: 'high',
  priority: 'urgent',
  suggestedAction: 'Request quotes this week',
};
const parsedRec = RecommendationSchema.safeParse(validRec);
assert(parsedRec.success === true, 'Valid recommendation parses successfully');

const invalidRec = {
  ...validRec,
  type: 'invalid_type', // not in enum
};
const parsedInvalidRec = RecommendationSchema.safeParse(invalidRec);
assert(parsedInvalidRec.success === false, 'Invalid recommendation enum must fail parsing');

// Test 5: Recommendations Refresh Validation
console.log('Testing recommendations refresh validation...');
const validRefresh = {
  recommendations: [validRec],
};
const validatedRefresh = validateRecommendationsResponse(validRefresh);
assert(validatedRefresh !== null, 'Valid recommendations refresh should parse');
assert(validatedRefresh!.recommendations.length === 1, 'Should contain 1 recommendation');

console.log('✅ ALL AI SCHEMA & VALIDATION TESTS PASSED!');
