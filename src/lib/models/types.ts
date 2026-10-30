// ============================================================
// CORE DOMAIN TYPES — AI Event Planning Assistant
// ============================================================

export type EventType = 'wedding' | 'birthday' | 'community';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type VendorStatus = 'researching' | 'contacted' | 'booked' | 'confirmed' | 'cancelled';

// ---- Event ----
export interface EventProfile {
  id: string;
  type: EventType;
  name: string;
  date: string; // ISO date string
  location: string;
  guestCount: number;
  totalBudget: number;
  currency: Currency;
  style: string;
  priorities: string[];
  requirements: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Budget ----
export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  isLocked: boolean;
  notes: string;
  aiSuggested?: boolean;
}

export interface Budget {
  eventId: string;
  categories: BudgetCategory[];
  contingencyPercent: number;
}

export interface BudgetSummary {
  total: number;
  allocated: number;
  spent: number;
  remaining: number;
  contingencyAmount: number;
  isOverAllocated: boolean;
  overAllocatedBy: number;
  utilizationPercent: number;
}

// ---- Tasks ----
export interface Task {
  id: string;
  eventId: string;
  title: string;
  category: string;
  deadline: string; // ISO date string
  priority: TaskPriority;
  status: TaskStatus;
  dependsOn: string[];
  notes: string;
  aiGenerated?: boolean;
  isOverdue?: boolean;
  daysUntilDeadline?: number;
}

// ---- Vendors ----
export interface Vendor {
  id: string;
  eventId: string;
  category: string;
  name: string;
  estimatedCost: number;
  status: VendorStatus;
  contactInfo: string;
  deadline: string;
  notes: string;
  aiSuggested?: boolean;
}

// ---- Recommendations ----
export type RecommendationType =
  | 'budget'
  | 'timeline'
  | 'vendor'
  | 'risk'
  | 'personalization'
  | 'idea';
export type RecommendationPriority = 'urgent' | 'high' | 'medium' | 'low';
export type RecommendationImpact = 'high' | 'medium' | 'low';

export interface PlanningRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  explanation: string;
  impact: RecommendationImpact;
  priority: RecommendationPriority;
  suggestedAction: string;
  dismissed?: boolean;
}

// ---- Scenarios ----
export interface ScenarioChange {
  field: 'totalBudget' | 'guestCount' | 'date' | 'priorities' | 'budgetCategory' | 'vendorCancellation' | 'weatherEmergency';
  label?: string;
  from: number | string | string[];
  to: number | string | string[];
  categoryId?: string; // for budgetCategory changes
  reason?: string;
}

export interface BudgetAdjustment {
  categoryId: string;
  categoryName: string;
  currentAmount: number;
  suggestedAmount: number;
  difference: number;
  reason: string;
}

export interface ScenarioImpact {
  financialDelta: number;
  budgetAdjustments: BudgetAdjustment[];
  financialExplanation: string;
  experienceExplanation: string;
  riskExplanation: string;
  affectedTasks: string[];
  overallRiskLevel: 'low' | 'medium' | 'high';
}

export interface Scenario {
  id: string;
  eventId: string;
  name: string;
  description: string;
  changes: ScenarioChange[];
  impact: ScenarioImpact;
  applied: boolean;
  createdAt: string;
}

// ---- AI Chat ----
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionButtons?: ChatActionButton[];
}

export interface ChatActionButton {
  label: string;
  action: string;
  data?: Record<string, unknown>;
}

// ---- Full Event Plan ----
export interface EventPlan {
  event: EventProfile;
  budget: Budget;
  tasks: Task[];
  vendors: Vendor[];
  recommendations: PlanningRecommendation[];
  scenarios: Scenario[];
  chat: ChatMessage[];
  generatedAt: string;
  planVersion: number;
}

// ---- AI API Payloads ----
export interface EventContext {
  eventType: EventType;
  eventName: string;
  date: string;
  location: string;
  guestCount: number;
  totalBudget: number;
  currency: Currency;
  style: string;
  priorities: string[];
  requirements: string;
  daysUntilEvent: number;
  currentBudgetCategories?: Array<{ name: string; allocated: number }>;
  currentVendors?: Array<{ category: string; status: VendorStatus }>;
  currentTasks?: Array<{ title: string; status: TaskStatus; priority: TaskPriority }>;
}
