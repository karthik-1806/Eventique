// ============================================================
// BUDGET ENGINE — Deterministic budget calculations
// AI must NEVER be the source of truth for arithmetic
// ============================================================

import type {
  Budget,
  BudgetCategory,
  BudgetSummary,
  EventProfile,
  EventType,
} from '@/lib/models/types';
import { v4 as uuidv4 } from 'uuid';

// Default budget allocations by event type (percentages)
const DEFAULT_ALLOCATIONS: Record<EventType, Array<{ name: string; percent: number }>> = {
  wedding: [
    { name: 'Venue', percent: 30 },
    { name: 'Catering', percent: 25 },
    { name: 'Photography & Video', percent: 10 },
    { name: 'Decoration & Flowers', percent: 10 },
    { name: 'Entertainment & Music', percent: 7 },
    { name: 'Wedding Attire', percent: 5 },
    { name: 'Invitations & Stationery', percent: 2 },
    { name: 'Transportation', percent: 3 },
    { name: 'Accommodation', percent: 3 },
    { name: 'Miscellaneous', percent: 3 },
    { name: 'Contingency', percent: 2 },
  ],
  birthday: [
    { name: 'Venue', percent: 25 },
    { name: 'Catering & Cake', percent: 30 },
    { name: 'Decoration', percent: 15 },
    { name: 'Entertainment', percent: 15 },
    { name: 'Photography', percent: 8 },
    { name: 'Invitations', percent: 2 },
    { name: 'Transportation', percent: 2 },
    { name: 'Miscellaneous', percent: 2 },
    { name: 'Contingency', percent: 1 },
  ],
  community: [
    { name: 'Venue', percent: 20 },
    { name: 'Catering', percent: 30 },
    { name: 'Audio/Visual Equipment', percent: 12 },
    { name: 'Decoration & Signage', percent: 8 },
    { name: 'Security', percent: 5 },
    { name: 'Transportation', percent: 5 },
    { name: 'Marketing & Invitations', percent: 7 },
    { name: 'Permits & Insurance', percent: 5 },
    { name: 'Volunteers & Staff', percent: 5 },
    { name: 'Miscellaneous', percent: 2 },
    { name: 'Contingency', percent: 1 },
  ],
};

/**
 * Generate default budget categories from an event profile.
 * Purely deterministic — no AI involved.
 */
export function generateDefaultBudget(event: EventProfile): Budget {
  const allocations = DEFAULT_ALLOCATIONS[event.type];
  const categories: BudgetCategory[] = allocations.map((a) => ({
    id: uuidv4(),
    name: a.name,
    allocated: Math.round((a.percent / 100) * event.totalBudget),
    spent: 0,
    isLocked: false,
    notes: '',
    aiSuggested: false,
  }));

  return {
    eventId: event.id,
    categories,
    contingencyPercent: 5,
  };
}

/**
 * Apply AI-suggested budget allocations to an existing budget.
 * We use deterministic scaling to preserve the total.
 */
export function applyAISuggestedAllocations(
  budget: Budget,
  suggestions: Array<{ name: string; percent: number }>,
  totalBudget: number,
): Budget {
  const existingNames = new Set(budget.categories.map((c) => c.name));
  const updatedCategories: BudgetCategory[] = suggestions.map((s) => {
    const existing = budget.categories.find((c) => c.name === s.name);
    return {
      id: existing?.id ?? uuidv4(),
      name: s.name,
      allocated: Math.round((s.percent / 100) * totalBudget),
      spent: existing?.spent ?? 0,
      isLocked: existing?.isLocked ?? false,
      notes: existing?.notes ?? '',
      aiSuggested: !existingNames.has(s.name),
    };
  });

  return { ...budget, categories: updatedCategories };
}

/**
 * Calculate a full budget summary from a budget + total.
 * Purely deterministic.
 */
export function calculateBudgetSummary(budget: Budget, totalBudget: number): BudgetSummary {
  const allocated = budget.categories.reduce((sum, c) => sum + c.allocated, 0);
  const spent = budget.categories.reduce((sum, c) => sum + c.spent, 0);
  const remaining = totalBudget - spent;
  const contingencyAmount = Math.round((budget.contingencyPercent / 100) * totalBudget);
  const isOverAllocated = allocated > totalBudget;
  const overAllocatedBy = isOverAllocated ? allocated - totalBudget : 0;
  const utilizationPercent = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;

  return {
    total: totalBudget,
    allocated,
    spent,
    remaining,
    contingencyAmount,
    isOverAllocated,
    overAllocatedBy,
    utilizationPercent,
  };
}

/**
 * Recalculate budget when total budget changes.
 * Proportionally scale unlocked categories; preserve locked ones.
 */
export function recalculateBudgetForNewTotal(
  budget: Budget,
  oldTotal: number,
  newTotal: number,
): Budget {
  const lockedSum = budget.categories
    .filter((c) => c.isLocked)
    .reduce((sum, c) => sum + c.allocated, 0);

  const unlockedSum = budget.categories
    .filter((c) => !c.isLocked)
    .reduce((sum, c) => sum + c.allocated, 0);

  const availableForUnlocked = newTotal - lockedSum;
  const scaleFactor = unlockedSum > 0 ? availableForUnlocked / unlockedSum : 0;

  const categories = budget.categories.map((c) => {
    if (c.isLocked) return c;
    return {
      ...c,
      allocated: Math.max(0, Math.round(c.allocated * scaleFactor)),
    };
  });

  return { ...budget, categories };
}

/**
 * Update a single budget category's allocated amount.
 * Returns updated budget with validation info.
 */
export function updateCategoryAllocation(
  budget: Budget,
  categoryId: string,
  newAmount: number,
): Budget {
  const categories = budget.categories.map((c) =>
    c.id === categoryId ? { ...c, allocated: Math.max(0, newAmount) } : c,
  );
  return { ...budget, categories };
}

/**
 * Record an expense against a category.
 */
export function recordExpense(budget: Budget, categoryId: string, amount: number): Budget {
  const categories = budget.categories.map((c) =>
    c.id === categoryId ? { ...c, spent: Math.max(0, c.spent + amount) } : c,
  );
  return { ...budget, categories };
}

/**
 * Get per-guest cost estimate.
 */
export function getPerGuestCost(totalBudget: number, guestCount: number): number {
  if (guestCount <= 0) return 0;
  return Math.round(totalBudget / guestCount);
}

/**
 * Estimate catering cost based on guest count and event type.
 */
export function estimateCateringCost(
  guestCount: number,
  eventType: EventType,
  currency: string,
): number {
  const perPersonRates: Record<EventType, Record<string, number>> = {
    wedding: { INR: 1500, USD: 75, EUR: 65, GBP: 55 },
    birthday: { INR: 800, USD: 40, EUR: 35, GBP: 30 },
    community: { INR: 600, USD: 25, EUR: 22, GBP: 18 },
  };
  const rate = perPersonRates[eventType][currency] ?? perPersonRates[eventType]['INR'];
  return rate * guestCount;
}

/**
 * Determine if budget is healthy, at-risk, or over.
 */
export function getBudgetHealthStatus(
  summary: BudgetSummary,
): 'healthy' | 'at_risk' | 'over_budget' {
  if (summary.isOverAllocated || (summary.total > 0 && summary.spent > summary.total)) {
    return 'over_budget';
  }
  if (summary.total > 0 && summary.spent / summary.total > 0.9) {
    return 'at_risk';
  }
  return 'healthy';
}

/**
 * Format currency amount for display, supporting negative amounts and compact notation.
 */
export function formatCurrency(amount: number, currency: string): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  const symbol = symbols[currency] ?? currency;
  const prefix = isNegative ? `-${symbol}` : symbol;

  if (currency === 'INR') {
    // Indian numbering system
    if (abs >= 10000000) return `${prefix}${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `${prefix}${(abs / 100000).toFixed(2)}L`;
    if (abs >= 1000) return `${prefix}${(abs / 1000).toFixed(1)}K`;
    return `${prefix}${abs.toLocaleString('en-IN')}`;
  }

  if (abs >= 1000000) return `${prefix}${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${prefix}${(abs / 1000).toFixed(1)}K`;
  return `${prefix}${abs.toLocaleString()}`;
}

export { DEFAULT_ALLOCATIONS };
