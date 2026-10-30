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

// Budget category priority tiers for realistic water-fall budget reduction
// Tier 1 (Discretionary - absorbs cuts first with highest elasticity)
// Tier 2 (Semi-core - absorbs moderate cuts)
// Tier 3 (Core essentials - protected, absorbs cuts only as a last resort)
const TIER_WEIGHTS: Record<string, number> = {
  // Tier 1: Discretionary / Flexible (weight 3.5)
  accommodation: 3.5,
  transportation: 3.5,
  transport: 3.5,
  invitations: 3.5,
  marketing: 3.5,
  entertainment: 3.2,
  music: 3.2,
  decoration: 3.0,
  flowers: 3.0,
  signage: 3.0,
  miscellaneous: 3.0,
  contingency: 2.8,

  // Tier 2: Semi-Core (weight 1.5)
  photography: 1.5,
  video: 1.5,
  'audio/visual': 1.5,
  av: 1.5,
  attire: 1.4,

  // Tier 3: Core Essentials (weight 0.4 - strongly protected)
  catering: 0.5,
  cake: 0.6,
  venue: 0.3,
  security: 0.5,
  permits: 0.4,
  staff: 0.5,
  volunteers: 0.5,
};

function getCategoryTierWeight(categoryName: string): number {
  const lower = categoryName.toLowerCase();
  for (const [key, weight] of Object.entries(TIER_WEIGHTS)) {
    if (lower.includes(key)) return weight;
  }
  return 1.0; // default medium elasticity
}

/**
 * Calculate the financial impact of a budget reduction.
 * Purely deterministic — AI only explains the results afterward.
 * Uses priority-tiered elasticity so discretionary categories absorb reductions first.
 */
export function calculateBudgetReductionImpact(
  currentBudget: number,
  newBudget: number,
  budgetCategories: Budget['categories'],
  currency: string = 'INR',
): { adjustments: BudgetAdjustment[]; totalReduction: number } {
  const safeCurrent = Math.max(0, currentBudget);
  const safeNew = Math.max(0, newBudget);
  const totalReduction = safeCurrent - safeNew;

  if (totalReduction <= 0 || safeCurrent <= 0) {
    return { adjustments: [], totalReduction: 0 };
  }

  const unlockedCategories = budgetCategories.filter((c) => !c.isLocked && c.allocated > 0);
  if (unlockedCategories.length === 0) {
    return { adjustments: [], totalReduction: 0 };
  }

  // Calculate total weighted elasticity
  let totalWeightedElasticity = 0;
  const categoryWeights = unlockedCategories.map((cat) => {
    const tierWeight = getCategoryTierWeight(cat.name);
    const weightedElasticity = cat.allocated * tierWeight;
    totalWeightedElasticity += weightedElasticity;
    return { cat, weightedElasticity };
  });

  const adjustments: BudgetAdjustment[] = [];
  let reductionAllocatedSoFar = 0;

  for (let i = 0; i < categoryWeights.length; i++) {
    const { cat, weightedElasticity } = categoryWeights[i];
    const isLast = i === categoryWeights.length - 1;

    let targetReduction: number;
    if (isLast) {
      // Last category absorbs any rounding difference to ensure exact match
      targetReduction = totalReduction - reductionAllocatedSoFar;
    } else {
      const share = totalWeightedElasticity > 0 ? weightedElasticity / totalWeightedElasticity : 1 / categoryWeights.length;
      targetReduction = Math.round(totalReduction * share);
    }

    // Do not reduce category below 0
    const actualReduction = Math.min(cat.allocated, Math.max(0, targetReduction));
    reductionAllocatedSoFar += actualReduction;

    if (actualReduction > 0) {
      const suggestedAmount = cat.allocated - actualReduction;
      adjustments.push({
        categoryId: cat.id,
        categoryName: cat.name,
        currentAmount: cat.allocated,
        suggestedAmount,
        difference: -actualReduction,
        reason: getReductionReason(cat.name, actualReduction, currency),
      });
    }
  }

  return { adjustments, totalReduction };
}

function getReductionReason(categoryName: string, amount: number, currency: string = 'INR'): string {
  const name = categoryName.toLowerCase();
  const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const sym = symbols[currency] ?? currency;
  const formattedAmount = `${sym}${amount.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`;

  if (name.includes('decoration') || name.includes('flowers')) return `Opt for minimalist floral arrangements and repurposed decor (-${formattedAmount})`;
  if (name.includes('entertainment') || name.includes('music')) return `Streamline DJ/performance schedule or reduce set hours (-${formattedAmount})`;
  if (name.includes('photography') || name.includes('video')) return `Focus on core ceremony coverage, reducing extra crew hours (-${formattedAmount})`;
  if (name.includes('invitation') || name.includes('marketing')) return `Transition to digital invites and minimal printed collateral (-${formattedAmount})`;
  if (name.includes('transport')) return `Consolidate guest shuttles and optimize trip windows (-${formattedAmount})`;
  if (name.includes('accommodation')) return `Prioritize VIP guest rooms and negotiate group tariff discounts (-${formattedAmount})`;
  if (name.includes('catering') || name.includes('cake')) return `Refine buffet variety and live counters while safeguarding main course quality (-${formattedAmount})`;
  if (name.includes('venue')) return `Retain primary hall booking while trimming ancillary suite charges (-${formattedAmount})`;
  if (name.includes('miscellaneous') || name.includes('contingency')) return `Tighten incidental expense buffer (-${formattedAmount})`;
  return `Targeted priority reduction of ${formattedAmount}`;
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
        const { adjustments } = calculateBudgetReductionImpact(from, to, budget.categories, event.currency);
        budgetAdjustments.push(...adjustments);

        // Risk assessment
        const reductionPercent = from > 0 ? Math.abs(delta) / from : 0;
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

    if (change.field === 'vendorCancellation') {
      overallRiskLevel = 'high';
      const estimatedSurcharge = Math.round(event.totalBudget * 0.05);
      financialDelta += estimatedSurcharge;
      affectedTasks.push('Emergency vendor search', 'Review contract cancellation clause', 'Secure backup deposits');
    }

    if (change.field === 'weatherEmergency') {
      overallRiskLevel = overallRiskLevel === 'high' ? 'high' : 'medium';
      const weatherCost = Math.round(event.totalBudget * 0.04);
      financialDelta += weatherCost;
      affectedTasks.push('Order weatherproofing canopy/tents', 'Confirm indoor backup space', 'Check electrical grounding');
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
  if (changes.some((c) => c.field === 'vendorCancellation')) {
    return 'Loss of primary vendor disrupts scheduled operations. Immediate action needed to secure a backup vendor and preserve attendee experience.';
  }
  if (changes.some((c) => c.field === 'weatherEmergency')) {
    return 'Outdoor experience must pivot indoors or provide shelter to ensure guest comfort, safety, and event continuity.';
  }

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
  const hasVendorCancel = changes.some((c) => c.field === 'vendorCancellation');
  const hasWeatherAlert = changes.some((c) => c.field === 'weatherEmergency');
  if (hasVendorCancel) {
    return 'Critical risk: Vendor cancellation requires immediate replacement. Rush booking premiums and availability constraints are likely.';
  }
  if (hasWeatherAlert) {
    return 'Moderate-High risk: Weather changes require physical infrastructure safeguards (tents/indoor spaces) and rapid vendor re-coordination.';
  }

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
