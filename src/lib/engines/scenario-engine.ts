// ============================================================
// SCENARIO ENGINE — What-if analysis (deterministic impact calc)
// ============================================================

import type {
  Scenario,
  ScenarioChange,
  ScenarioImpact,
  BudgetAdjustment,
  Budget,
  EventProfile,
} from '@/lib/models/types';
import { v4 as uuidv4 } from 'uuid';
import { recalculateBudgetForNewTotal } from './budget-engine';

// Budget categories that can be reduced, in priority order (lowest priority first)
const REDUCTION_PRIORITY_ORDER = [
  'Accommodation',
  'Transportation',
  'Invitations & Stationery',
  'Invitations',
  'Marketing & Invitations',
  'Entertainment & Music',
  'Entertainment',
  'Decoration & Flowers',
  'Decoration',
  'Photography & Video',
  'Photography',
  'Audio/Visual Equipment',
  'Catering & Cake',
  'Catering',
  'Miscellaneous',
  'Contingency',
];

/**
 * Calculate the financial impact of a budget reduction.
 * Purely deterministic — AI only explains the results afterward.
 */
export function calculateBudgetReductionImpact(
  currentBudget: number,
  newBudget: number,
  budgetCategories: Budget['categories'],
): { adjustments: BudgetAdjustment[]; totalReduction: number } {
  const totalReduction = currentBudget - newBudget;
  if (totalReduction <= 0) {
    return { adjustments: [], totalReduction: 0 };
  }

  // Scale categories proportionally, prioritizing reducing non-critical categories first
  const adjustments: BudgetAdjustment[] = [];
  let remainingReduction = totalReduction;

  // Sort categories by reduction priority (least important first)
  const sortedCategories = [...budgetCategories]
    .filter((c) => !c.isLocked)
    .sort((a, b) => {
      const aIdx = REDUCTION_PRIORITY_ORDER.findIndex((n) => a.name.includes(n) || n.includes(a.name));
      const bIdx = REDUCTION_PRIORITY_ORDER.findIndex((n) => b.name.includes(n) || n.includes(b.name));
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

  const scaleFactor = newBudget / currentBudget;

  for (const cat of sortedCategories) {
    if (remainingReduction <= 0) break;

    const scaledAmount = Math.round(cat.allocated * scaleFactor);
    const reduction = cat.allocated - scaledAmount;

    if (reduction > 0) {
      adjustments.push({
        categoryId: cat.id,
        categoryName: cat.name,
        currentAmount: cat.allocated,
        suggestedAmount: scaledAmount,
        difference: -reduction,
        reason: getReductionReason(cat.name, reduction),
      });
      remainingReduction -= reduction;
    }
  }

  return { adjustments, totalReduction };
}

function getReductionReason(categoryName: string, amount: number): string {
  const name = categoryName.toLowerCase();
  if (name.includes('decoration')) return 'Opt for simpler arrangements and DIY elements';
  if (name.includes('entertainment')) return 'Streamline entertainment program or reduce duration';
  if (name.includes('photography')) return 'Reduce coverage hours or skip videography';
  if (name.includes('invitation')) return 'Use digital invitations and limit printed materials';
  if (name.includes('transport')) return 'Reduce shuttle runs or use public transport';
  if (name.includes('accommodation')) return 'Negotiate group rates or reduce rooms';
  if (name.includes('catering')) return 'Simplify menu or reduce per-head cost';
  if (name.includes('miscellaneous')) return 'Reduce contingency and discretionary items';
  return `Proportional reduction of ₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Calculate impact of guest count change.
 */
export function calculateGuestCountImpact(
  oldCount: number,
  newCount: number,
  budget: Budget,
  event?: EventProfile,
): { estimatedCostDelta: number; affectedCategories: string[] } {
  if (oldCount <= 0) return { estimatedCostDelta: 0, affectedCategories: [] };
  const countRatio = newCount / oldCount;
  const affectedCategories: string[] = [];

  // These categories scale with guest count
  const guestScaledCategories = ['Catering', 'Invitations', 'Accommodation', 'Transportation'];

  let estimatedCostDelta = 0;
  for (const cat of budget.categories) {
    const isGuestScaled = guestScaledCategories.some((name) =>
      cat.name.toLowerCase().includes(name.toLowerCase()),
    );
    if (isGuestScaled) {
      const delta = Math.round(cat.allocated * (countRatio - 1));
      estimatedCostDelta += delta;
      affectedCategories.push(cat.name);
    }
  }

  // If event provides specific catering estimates, cross-verify
  if (event && affectedCategories.length === 0) {
    const deltaGuests = newCount - oldCount;
    estimatedCostDelta = Math.round((event.totalBudget / (oldCount || 100)) * 0.3 * deltaGuests);
  }

  return { estimatedCostDelta, affectedCategories };
}

/**
 * Build a new Scenario object from user changes.
 */
export function buildScenario(
  eventId: string,
  name: string,
  description: string,
  changes: ScenarioChange[],
  budget: Budget,
  event: EventProfile,
): Scenario {
  // Deterministic impact calculation
  const impact = calculateScenarioImpact(changes, budget, event);

  return {
    id: uuidv4(),
    eventId,
    name,
    description,
    changes,
    impact,
    applied: false,
    createdAt: new Date().toISOString(),
  };
}

function calculateScenarioImpact(
  changes: ScenarioChange[],
  budget: Budget,
  event: EventProfile,
): ScenarioImpact {
  let financialDelta = 0;
  const budgetAdjustments: BudgetAdjustment[] = [];
  const affectedTasks: string[] = [];
  let overallRiskLevel: ScenarioImpact['overallRiskLevel'] = 'low';

  for (const change of changes) {
    if (change.field === 'totalBudget') {
      const from = Number(change.from);
      const to = Number(change.to);
      const delta = to - from;
      financialDelta += delta;

      if (delta < 0) {
        const { adjustments } = calculateBudgetReductionImpact(from, to, budget.categories);
        budgetAdjustments.push(...adjustments);

        // Risk assessment
        const reductionPercent = Math.abs(delta) / from;
        if (reductionPercent > 0.3) overallRiskLevel = 'high';
        else if (reductionPercent > 0.15) overallRiskLevel = 'medium';

        affectedTasks.push('Review vendor contracts', 'Update budget allocations');
      }
    }

    if (change.field === 'guestCount') {
      const from = Number(change.from);
      const to = Number(change.to);
      if (to > from) {
        overallRiskLevel = overallRiskLevel === 'high' ? 'high' : 'medium';
        affectedTasks.push('Update caterer headcount', 'Adjust venue capacity', 'Revise transportation plan');
      }
    }

    if (change.field === 'date') {
      overallRiskLevel = overallRiskLevel === 'high' ? 'high' : 'medium';
      affectedTasks.push('Reschedule all vendors', 'Update venue booking', 'Revise task deadlines');
    }
  }

  return {
    financialDelta,
    budgetAdjustments,
    financialExplanation: generateFinancialExplanation(financialDelta, budgetAdjustments, event.currency),
    experienceExplanation: generateExperienceExplanation(changes, budgetAdjustments),
    riskExplanation: generateRiskExplanation(overallRiskLevel, changes),
    affectedTasks,
    overallRiskLevel,
  };
}

function generateFinancialExplanation(
  delta: number,
  adjustments: BudgetAdjustment[],
  currency: string = 'INR',
): string {
  if (delta === 0) return 'No financial impact.';
  const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const sym = symbols[currency] ?? currency;
  const absAmount = Math.abs(delta).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');
  if (delta < 0) {
    return `Budget reduces by ${sym}${absAmount}. Adjustments spread across ${adjustments.length} categories, prioritizing non-essential items first.`;
  }
  return `Budget increases by ${sym}${absAmount}, providing room to enhance key experience areas.`;
}

function generateExperienceExplanation(
  changes: ScenarioChange[],
  adjustments: BudgetAdjustment[],
): string {
  const highImpactReductions = adjustments.filter(
    (a) => a.categoryName.toLowerCase().includes('catering') ||
           a.categoryName.toLowerCase().includes('venue'),
  );

  if (highImpactReductions.length > 0) {
    return 'Core guest experience categories are affected. Consider negotiating with vendors before reducing catering or venue budgets.';
  }
  return 'Reductions focus on secondary elements. Core guest experience should remain largely intact.';
}

function generateRiskExplanation(
  riskLevel: ScenarioImpact['overallRiskLevel'],
  changes: ScenarioChange[],
): string {
  const hasDateShift = changes.some((c) => c.field === 'date');
  const hasGuestExpansion = changes.some((c) => c.field === 'guestCount' && Number(c.to) > Number(c.from));

  if (riskLevel === 'high') {
    return `High risk: Significant changes ${hasDateShift ? 'including date rescheduling ' : ''}may require renegotiating vendor contracts and could incur penalty fees.`;
  }
  if (riskLevel === 'medium') {
    return `Medium risk: Some vendors ${hasGuestExpansion ? '(especially catering) ' : ''}must be notified early. Verify deposit policies before committing.`;
  }
  return 'Low risk: Adjustments are within manageable thresholds and unlikely to disrupt booked vendors.';
}

/**
 * Apply a scenario to an event and budget.
 */
export function applyScenario(
  event: EventProfile,
  budget: Budget,
  scenario: Scenario,
): { event: EventProfile; budget: Budget } {
  let updatedEvent = { ...event };
  let updatedBudget = { ...budget };

  for (const change of scenario.changes) {
    if (change.field === 'totalBudget') {
      const newBudget = Number(change.to);
      updatedBudget = recalculateBudgetForNewTotal(updatedBudget, updatedEvent.totalBudget, newBudget);
      updatedEvent = { ...updatedEvent, totalBudget: newBudget };
    }
    if (change.field === 'guestCount') {
      updatedEvent = { ...updatedEvent, guestCount: Number(change.to) };
    }
    if (change.field === 'date') {
      updatedEvent = { ...updatedEvent, date: String(change.to) };
    }
  }

  // Apply suggested budget adjustments
  for (const adj of scenario.impact.budgetAdjustments) {
    const cat = updatedBudget.categories.find((c) => c.id === adj.categoryId);
    if (cat && !cat.isLocked) {
      updatedBudget = {
        ...updatedBudget,
        categories: updatedBudget.categories.map((c) =>
          c.id === adj.categoryId ? { ...c, allocated: adj.suggestedAmount } : c,
        ),
      };
    }
  }

  return { event: updatedEvent, budget: updatedBudget };
}
