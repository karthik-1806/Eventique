'use client';

// ============================================================
// EVENT CONTEXT — Global state management for event planning
// ============================================================

import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import type {
  EventPlan,
  EventProfile,
  Vendor,
  PlanningRecommendation,
  Scenario,
  ChatMessage,
  TaskStatus,
  EventContext as EventContextType,
} from '@/lib/models/types';
import {
  generateDefaultBudget,
  recalculateBudgetForNewTotal,
  updateCategoryAllocation,
  calculateBudgetSummary,
  formatCurrency,
} from '@/lib/engines/budget-engine';
import {
  generateTasks,
  refreshTaskDeadlines,
  recalculateTaskDeadlines,
  getDaysUntilEvent,
} from '@/lib/engines/timeline-engine';
import { applyScenario } from '@/lib/engines/scenario-engine';
import { DEMO_PLANS } from '@/lib/demo-data/demo-plans';
import { v4 as uuidv4 } from 'uuid';

// ---- State ----
interface AppState {
  currentPlan: EventPlan | null;
  isLoading: boolean;
  isGeneratingPlan: boolean;
  isChatLoading: boolean;
  error: string | null;
  activeTab: string;
  isHydrated: boolean;
}

// ---- Actions ----
type AppAction =
  | { type: 'SET_PLAN'; payload: EventPlan }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_CHAT_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_HYDRATED' }
  | { type: 'UPDATE_EVENT'; payload: Partial<EventProfile> }
  | { type: 'UPDATE_BUDGET_CATEGORY'; payload: { categoryId: string; allocated: number } }
  | { type: 'UPDATE_BUDGET_SPENT'; payload: { categoryId: string; spent: number } }
  | { type: 'UPDATE_TASK_STATUS'; payload: { taskId: string; status: TaskStatus } }
  | { type: 'UPDATE_VENDOR'; payload: Partial<Vendor> & { id: string } }
  | { type: 'ADD_VENDOR'; payload: Vendor }
  | { type: 'DISMISS_RECOMMENDATION'; payload: string }
  | { type: 'ADD_SCENARIO'; payload: Scenario }
  | { type: 'APPLY_SCENARIO'; payload: string }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_RECOMMENDATIONS'; payload: PlanningRecommendation[] }
  | { type: 'CLEAR_PLAN' };

function reducer(state: AppState, action: AppAction): AppState {
  if (
    !state.currentPlan &&
    action.type !== 'SET_PLAN' &&
    action.type !== 'SET_LOADING' &&
    action.type !== 'SET_GENERATING' &&
    action.type !== 'SET_ERROR' &&
    action.type !== 'CLEAR_PLAN' &&
    action.type !== 'SET_HYDRATED'
  ) {
    return state;
  }

  switch (action.type) {
    case 'SET_HYDRATED':
      return { ...state, isHydrated: true };

    case 'SET_PLAN':
      return { ...state, currentPlan: action.payload, error: null };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_GENERATING':
      return { ...state, isGeneratingPlan: action.payload };

    case 'SET_CHAT_LOADING':
      return { ...state, isChatLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };

    case 'CLEAR_PLAN':
      return { ...state, currentPlan: null, error: null };

    case 'UPDATE_EVENT': {
      if (!state.currentPlan) return state;
      const oldBudget = state.currentPlan.event.totalBudget;
      const newBudget = action.payload.totalBudget ?? oldBudget;
      let updatedBudget = state.currentPlan.budget;

      if (newBudget !== oldBudget) {
        updatedBudget = recalculateBudgetForNewTotal(updatedBudget, oldBudget, newBudget);
      }

      const updatedEvent = {
        ...state.currentPlan.event,
        ...action.payload,
        updatedAt: new Date().toISOString(),
      };

      const tasks = recalculateTaskDeadlines(state.currentPlan.tasks, updatedEvent);

      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          event: updatedEvent,
          budget: updatedBudget,
          tasks,
        },
      };
    }

    case 'UPDATE_BUDGET_CATEGORY': {
      if (!state.currentPlan) return state;
      const updatedBudget = updateCategoryAllocation(
        state.currentPlan.budget,
        action.payload.categoryId,
        action.payload.allocated,
      );
      return { ...state, currentPlan: { ...state.currentPlan, budget: updatedBudget } };
    }

    case 'UPDATE_BUDGET_SPENT': {
      if (!state.currentPlan) return state;
      const categories = state.currentPlan.budget.categories.map((c) =>
        c.id === action.payload.categoryId ? { ...c, spent: action.payload.spent } : c,
      );
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          budget: { ...state.currentPlan.budget, categories },
        },
      };
    }

    case 'UPDATE_TASK_STATUS': {
      if (!state.currentPlan) return state;
      const tasks = state.currentPlan.tasks.map((t) =>
        t.id === action.payload.taskId ? { ...t, status: action.payload.status } : t,
      );
      return { ...state, currentPlan: { ...state.currentPlan, tasks } };
    }

    case 'UPDATE_VENDOR': {
      if (!state.currentPlan) return state;
      const vendors = state.currentPlan.vendors.map((v) =>
        v.id === action.payload.id ? { ...v, ...action.payload } : v,
      );
      return { ...state, currentPlan: { ...state.currentPlan, vendors } };
    }

    case 'ADD_VENDOR': {
      if (!state.currentPlan) return state;
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          vendors: [...state.currentPlan.vendors, action.payload],
        },
      };
    }

    case 'DISMISS_RECOMMENDATION': {
      if (!state.currentPlan) return state;
      const recommendations = state.currentPlan.recommendations.map((r) =>
        r.id === action.payload ? { ...r, dismissed: true } : r,
      );
      return { ...state, currentPlan: { ...state.currentPlan, recommendations } };
    }

    case 'ADD_SCENARIO': {
      if (!state.currentPlan) return state;
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          scenarios: [...state.currentPlan.scenarios, action.payload],
        },
      };
    }

    case 'APPLY_SCENARIO': {
      if (!state.currentPlan) return state;
      const scenario = state.currentPlan.scenarios.find((s) => s.id === action.payload);
      if (!scenario) return state;

      const { event, budget } = applyScenario(
        state.currentPlan.event,
        state.currentPlan.budget,
        scenario,
      );

      const tasks = recalculateTaskDeadlines(state.currentPlan.tasks, event);

      const scenarios = state.currentPlan.scenarios.map((s) =>
        s.id === action.payload ? { ...s, applied: true } : s,
      );

      const scenarioDeltaSign = scenario.impact.financialDelta > 0 ? '+' : '';
      const formattedDelta = scenario.impact.financialDelta !== 0
        ? `${scenarioDeltaSign}${formatCurrency(scenario.impact.financialDelta, event.currency)}`
        : formatCurrency(0, event.currency);

      const scenarioNotice: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `⚡ **Constraint Changed & Scenario Applied: "${scenario.name}"**\n\n- **Impact:** ${formattedDelta} budget shift across ${scenario.impact.budgetAdjustments.length} categories\n- **Risk Level:** ${scenario.impact.overallRiskLevel.toUpperCase()}\n- **Reasoning:** ${scenario.impact.experienceExplanation}\n\nThe full plan, budget allocations, and task deadlines have been recalculated deterministically.`,
        timestamp: new Date().toISOString(),
      };

      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          event,
          budget,
          tasks,
          scenarios,
          chat: [...state.currentPlan.chat, scenarioNotice],
        },
      };
    }

    case 'ADD_CHAT_MESSAGE': {
      if (!state.currentPlan) return state;
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          chat: [...state.currentPlan.chat, action.payload],
        },
      };
    }

    case 'UPDATE_RECOMMENDATIONS': {
      if (!state.currentPlan) return state;
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          recommendations: action.payload,
        },
      };
    }

    default:
      return state;
  }
}

// ---- Context ----
interface EventContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  loadDemoPlan: (type: 'wedding' | 'birthday' | 'community') => void;
  createNewPlan: (event: EventProfile) => Promise<void>;
  getEventContext: () => EventContextType | null;
  getBudgetSummary: () => ReturnType<typeof calculateBudgetSummary> | null;
}

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    currentPlan: null,
    isLoading: false,
    isGeneratingPlan: false,
    isChatLoading: false,
    error: null,
    activeTab: 'overview',
    isHydrated: false,
  });

  // Client-side hydration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eventique_current_plan');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.event && parsed.budget) {
          dispatch({ type: 'SET_PLAN', payload: parsed });
        }
      }
    } catch (e) {
      console.warn('Failed to load saved plan from localStorage:', e);
    } finally {
      dispatch({ type: 'SET_HYDRATED' });
    }
  }, []);

  // Sync state to localStorage on updates
  useEffect(() => {
    if (state.isHydrated) {
      if (state.currentPlan) {
        try {
          localStorage.setItem('eventique_current_plan', JSON.stringify(state.currentPlan));
        } catch (e) {
          console.warn('Failed to persist plan to localStorage:', e);
        }
      } else {
        localStorage.removeItem('eventique_current_plan');
      }
    }
  }, [state.currentPlan, state.isHydrated]);

  const loadDemoPlan = useCallback((type: 'wedding' | 'birthday' | 'community') => {
    const plan = DEMO_PLANS[type]();
    dispatch({ type: 'SET_PLAN', payload: plan });
  }, []);

  const createNewPlan = useCallback(async (event: EventProfile) => {
    dispatch({ type: 'SET_GENERATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const budget = generateDefaultBudget(event);
      const tasks = refreshTaskDeadlines(generateTasks(event));

      const plan: EventPlan = {
        event,
        budget,
        tasks,
        vendors: [],
        recommendations: [],
        scenarios: [],
        chat: [
          {
            id: 'welcome',
            role: 'assistant',
            content: `Welcome! Your ${event.type} plan for **${event.name}** has been created.\n\nI've generated a budget breakdown across ${budget.categories.length} categories and a task timeline. Click "Generate AI Plan" to get personalized recommendations powered by Gemini AI.`,
            timestamp: new Date().toISOString(),
          },
        ],
        generatedAt: new Date().toISOString(),
        planVersion: 1,
      };

      dispatch({ type: 'SET_PLAN', payload: plan });
    } finally {
      dispatch({ type: 'SET_GENERATING', payload: false });
    }
  }, []);

  const getEventContext = useCallback((): EventContextType | null => {
    if (!state.currentPlan) return null;
    const { event, budget, vendors, tasks } = state.currentPlan;
    return {
      eventType: event.type,
      eventName: event.name,
      date: event.date,
      location: event.location,
      guestCount: event.guestCount,
      totalBudget: event.totalBudget,
      currency: event.currency,
      style: event.style,
      priorities: event.priorities,
      requirements: event.requirements,
      daysUntilEvent: getDaysUntilEvent(event.date),
      currentBudgetCategories: budget.categories.map((c) => ({
        name: c.name,
        allocated: c.allocated,
      })),
      currentVendors: vendors.map((v) => ({
        category: v.category,
        status: v.status,
      })),
      currentTasks: tasks.slice(0, 10).map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
    };
  }, [state.currentPlan]);

  const getBudgetSummary = useCallback(() => {
    if (!state.currentPlan) return null;
    return calculateBudgetSummary(state.currentPlan.budget, state.currentPlan.event.totalBudget);
  }, [state.currentPlan]);

  const contextValue = useMemo(
    () => ({ state, dispatch, loadDemoPlan, createNewPlan, getEventContext, getBudgetSummary }),
    [state, dispatch, loadDemoPlan, createNewPlan, getEventContext, getBudgetSummary],
  );

  return (
    <EventContext.Provider value={contextValue}>
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEventContext must be used within EventProvider');
  return ctx;
}
