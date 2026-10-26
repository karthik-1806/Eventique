// ============================================================
// COMPREHENSIVE ENGINE UNIT TESTS
// Deterministic testing for Budget, Timeline, and Scenario Engines
// ============================================================

import {
  generateDefaultBudget,
  recalculateBudgetForNewTotal,
  calculateBudgetSummary,
  getBudgetHealthStatus,
  formatCurrency,
} from './budget-engine';
import {
  generateTasks,
  getTaskStats,
  getPlanningProgress,
} from './timeline-engine';
import {
  calculateBudgetReductionImpact,
  calculateGuestCountImpact,
  buildScenario,
  applyScenario,
} from './scenario-engine';
import type { EventProfile } from '../models/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- RUNNING EVENT ENGINE TESTS ---');

const futureDate = new Date();
futureDate.setMonth(futureDate.getMonth() + 6);
const dateStr = futureDate.toISOString().split('T')[0];

const dummyEvent: EventProfile = {
  id: 'evt-1',
  type: 'wedding',
  name: 'Aarav & Meera Wedding',
  date: dateStr,
  location: 'Udaipur, Rajasthan',
  guestCount: 200,
  totalBudget: 1000000,
  currency: 'INR',
  style: 'Royal Heritage',
  priorities: ['Photography & Video', 'Catering'],
  requirements: 'Vegetarian gourmet catering',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 1. Budget Engine Tests
console.log('Testing Budget Engine...');
const weddingBudget = generateDefaultBudget(dummyEvent);
assert(weddingBudget.eventId === 'evt-1', 'Wedding budget eventId matches');
assert(weddingBudget.categories.length > 5, 'Wedding budget has multiple categories');

const totalAllocated = weddingBudget.categories.reduce((s, c) => s + c.allocated, 0);
assert(Math.abs(totalAllocated - 1000000) < 100, `Total allocated ${totalAllocated} is approximately 1000000`);

// Test locked categories during recalculation
weddingBudget.categories[0].isLocked = true;
const lockedAmount = weddingBudget.categories[0].allocated;
const recalculatedBudget = recalculateBudgetForNewTotal(weddingBudget, 1000000, 800000);
const recalculatedSummary = calculateBudgetSummary(recalculatedBudget, 800000);
assert(recalculatedSummary.total === 800000, 'New total is 800000');
assert(recalculatedBudget.categories[0].allocated === lockedAmount, 'Locked category allocation remained unchanged');

// Test Budget Summary & Health Status
const summary = calculateBudgetSummary(weddingBudget, 1000000);
assert(summary.total === 1000000, 'Summary total is 1000000');
assert(getBudgetHealthStatus(summary) === 'healthy', 'Health status is healthy initially');

// Test currency formatting (positive and negative, multi-currency)
assert(formatCurrency(150000, 'INR') === '₹1.50L', 'INR formatting applies compact Lakhs notation');
assert(formatCurrency(500, 'INR') === '₹500', 'Sub-thousand formatting displays standard amount');
assert(formatCurrency(-150000, 'INR') === '-₹1.50L', 'Negative INR applies leading minus before currency symbol');
assert(formatCurrency(-500, 'INR') === '-₹500', 'Negative sub-thousand INR displays -₹500');
assert(formatCurrency(50000, 'USD') === '$50.0K', 'USD formatting applies $ symbol and compact notation');
assert(formatCurrency(-25000, 'USD') === '-$25.0K', 'Negative USD formatting applies -$');
assert(formatCurrency(1200000, 'EUR') === '€1.2M', 'EUR formatting applies € symbol and compact Millions');
assert(formatCurrency(750, 'GBP') === '£750', 'GBP formatting applies £ symbol');

// 2. Timeline Engine Tests
console.log('Testing Timeline Engine...');

const weddingTasks = generateTasks(dummyEvent);
assert(weddingTasks.length >= 8, 'Generated sufficient tasks for wedding');
assert(weddingTasks.some((t) => t.priority === 'critical'), 'Has critical priority tasks');

const taskStats = getTaskStats(weddingTasks);
assert(taskStats.total === weddingTasks.length, 'Task stats total matches tasks count');
assert(taskStats.completed === 0, 'Initial completed tasks is 0');
assert(getPlanningProgress(weddingTasks) === 0, 'Initial progress is 0%');

// Mark one task completed and check progress
weddingTasks[0].status = 'completed';
assert(getPlanningProgress(weddingTasks) > 0, 'Progress increases when task is marked complete');

// 3. Scenario Engine Tests
console.log('Testing Scenario Engine...');

const reductionImpact = calculateBudgetReductionImpact(1000000, 850000, weddingBudget.categories);
assert(reductionImpact.totalReduction === 150000, 'Reduction is 150,000');
assert(reductionImpact.adjustments.length > 0, 'Adjustments generated');

// Test guest impact calculation
const guestImpact = calculateGuestCountImpact(200, 250, weddingBudget, dummyEvent);
assert(guestImpact.estimatedCostDelta > 0, 'Adding 50 guests increases estimated delta');
assert(guestImpact.affectedCategories.length > 0, 'Identifies affected categories (catering, etc.)');

// Test build and apply scenario
const testScenario = buildScenario(
  dummyEvent.id,
  '15% Cut',
  'Testing cut',
  [{ field: 'totalBudget', from: 1000000, to: 850000, reason: 'Budget cut' }],
  weddingBudget,
  dummyEvent
);
assert(testScenario.impact.financialDelta === -150000, 'Scenario financial delta matches');

const applied = applyScenario(dummyEvent, weddingBudget, testScenario);
assert(applied.event.totalBudget === 850000, 'Applied scenario updated event budget to 850000');
const appliedSummary = calculateBudgetSummary(applied.budget, applied.event.totalBudget);
assert(appliedSummary.total === 850000, 'Applied scenario updated budget summary total to 850000');

console.log('✅ ALL ENGINE TESTS PASSED SUCCESSFULLY!');
