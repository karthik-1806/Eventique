'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useEventContext } from '@/context/EventContext';
import type { RecommendationType, RecommendationImpact, RecommendationPriority } from '@/lib/models/types';
import { formatCurrency, getBudgetHealthStatus, calculateBudgetSummary } from '@/lib/engines/budget-engine';
import { getDaysUntilEvent, getPlanningProgress, getTaskStats, getUpcomingTasks } from '@/lib/engines/timeline-engine';

// Dashboard sections
import OverviewPanel from '@/components/dashboard/OverviewPanel';
import BudgetPanel from '@/components/dashboard/BudgetPanel';
import TimelinePanel from '@/components/dashboard/TimelinePanel';
import TasksPanel from '@/components/dashboard/TasksPanel';
import VendorsPanel from '@/components/dashboard/VendorsPanel';
import RecommendationsPanel from '@/components/dashboard/RecommendationsPanel';
import ScenariosPanel from '@/components/dashboard/ScenariosPanel';
import ChatPanel from '@/components/dashboard/ChatPanel';

import styles from './page.module.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '⊞' },
  { id: 'budget', label: 'Budget', icon: '◈' },
  { id: 'timeline', label: 'Timeline', icon: '◷' },
  { id: 'tasks', label: 'Tasks', icon: '◻' },
  { id: 'vendors', label: 'Vendors', icon: '◆' },
  { id: 'recommendations', label: 'AI Insights', icon: '✦' },
  { id: 'scenarios', label: 'What-if', icon: '⬦' },
];

const EVENT_TYPE_LABEL: Record<string, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday Party',
  community: 'Community Event',
};

const EVENT_TYPE_ICON: Record<string, string> = {
  wedding: '💍',
  birthday: '🎂',
  community: '🎪',
};

export default function DashboardPage() {
  const router = useRouter();
  const { state, dispatch, getEventContext } = useEventContext();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // Redirect only after hydration if no plan is present
  useEffect(() => {
    if (state.isHydrated && !state.currentPlan) {
      router.replace('/');
    }
  }, [state.isHydrated, state.currentPlan, router]);

  const generateAIPlan = useCallback(async () => {
    if (!state.currentPlan) return;
    setIsGeneratingAI(true);

    const ctx = getEventContext();
    if (!ctx) {
      setIsGeneratingAI(false);
      return;
    }

    try {
      const response = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      });

      if (!response.ok) {
        const err = await response.json();
        dispatch({ type: 'SET_ERROR', payload: err.error ?? 'AI plan generation failed' });
        return;
      }

      const { data } = await response.json();

      // Apply AI budget allocations
      const categories = data.budgetAllocations.map((a: { name: string; percent: number; reasoning: string }) => {
        const existing = state.currentPlan!.budget.categories.find((c) => c.name === a.name);
        return {
          id: existing?.id ?? uuidv4(),
          name: a.name,
          allocated: Math.round((a.percent / 100) * state.currentPlan!.event.totalBudget),
          spent: existing?.spent ?? 0,
          isLocked: existing?.isLocked ?? false,
          notes: a.reasoning.slice(0, 200),
          aiSuggested: true,
        };
      });

      // Merge vendors
      const newVendors = data.vendorRecommendations.map((v: { category: string; priority: string; reasoning: string; estimatedCostRange: string }) => ({
        id: uuidv4(),
        eventId: state.currentPlan!.event.id,
        category: v.category,
        name: '',
        estimatedCost: 0,
        status: 'researching' as const,
        contactInfo: '',
        deadline: '',
        notes: `${v.reasoning} (Est: ${v.estimatedCostRange})`,
        aiSuggested: true,
      }));

      // Build recommendations
      const allRecs = [
        ...data.planningRecommendations,
        ...data.riskWarnings,
      ].map((r: { type: string; title: string; explanation: string; impact: string; priority: string; suggestedAction: string }) => ({
        id: uuidv4(),
        type: (r.type as RecommendationType) || 'idea',
        title: r.title,
        explanation: r.explanation,
        impact: (r.impact as RecommendationImpact) || 'medium',
        priority: (r.priority as RecommendationPriority) || 'medium',
        suggestedAction: r.suggestedAction,
        dismissed: false,
      }));

      const updatedPlan = {
        ...state.currentPlan!,
        budget: { ...state.currentPlan!.budget, categories },
        vendors: [...state.currentPlan!.vendors.filter((v) => !v.aiSuggested), ...newVendors],
        recommendations: allRecs,
        chat: [
          ...state.currentPlan!.chat,
          {
            id: uuidv4(),
            role: 'assistant' as const,
            content: `✦ **AI Plan Generated!**\n\n${data.planSummary}\n\nI've updated your budget allocation, added vendor categories, and identified ${allRecs.length} recommendations. Check the **AI Insights** tab for the full breakdown.`,
            timestamp: new Date().toISOString(),
          },
        ],
        planVersion: (state.currentPlan?.planVersion ?? 1) + 1,
        generatedAt: new Date().toISOString(),
      };

      dispatch({ type: 'SET_PLAN', payload: updatedPlan });
      setAiGenerated(true);
      dispatch({ type: 'SET_ACTIVE_TAB', payload: 'recommendations' });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to AI service. Check your network.' });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [state.currentPlan, getEventContext, dispatch]);

  const currentPlan = state.currentPlan;

  const budgetSummary = useMemo(
    () => (currentPlan ? calculateBudgetSummary(currentPlan.budget, currentPlan.event.totalBudget) : null),
    [currentPlan],
  );
  const daysUntilEvent = useMemo(
    () => (currentPlan ? getDaysUntilEvent(currentPlan.event.date) : 0),
    [currentPlan],
  );
  const progress = useMemo(
    () => (currentPlan ? getPlanningProgress(currentPlan.tasks) : 0),
    [currentPlan],
  );
  const budgetHealth = useMemo(
    () => (budgetSummary ? getBudgetHealthStatus(budgetSummary) : 'healthy'),
    [budgetSummary],
  );
  const taskStats = useMemo(
    () => (currentPlan ? getTaskStats(currentPlan.tasks) : null),
    [currentPlan],
  );
  const activeTab = state.activeTab;
  const urgentRecs = useMemo(
    () => (currentPlan ? currentPlan.recommendations.filter((r) => r.priority === 'urgent' && !r.dismissed).length : 0),
    [currentPlan],
  );

  const setTab = useCallback(
    (tab: string) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab }),
    [dispatch],
  );

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, currentTabId: string) => {
      const currentIndex = TABS.findIndex((t) => t.id === currentTabId);
      if (currentIndex === -1) return;

      let targetIndex = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        targetIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        targetIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === 'Home') {
        targetIndex = 0;
      } else if (e.key === 'End') {
        targetIndex = TABS.length - 1;
      }

      if (targetIndex !== -1) {
        e.preventDefault();
        const targetTab = TABS[targetIndex];
        setTab(targetTab.id);
        const el = document.getElementById(`tab-${targetTab.id}`);
        el?.focus();
      }
    },
    [setTab],
  );

  // --- Action Center items derived with memoization ---
  const overdueTasks = useMemo(
    () => (currentPlan ? currentPlan.tasks.filter((t) => t.isOverdue && t.status !== 'completed') : []),
    [currentPlan],
  );
  const soonTasks = useMemo(
    () => (currentPlan ? getUpcomingTasks(currentPlan.tasks, 7) : []),
    [currentPlan],
  );
  const unconfirmedVendors = useMemo(
    () => (currentPlan ? currentPlan.vendors.filter((v) => v.status === 'researching' || v.status === 'contacted') : []),
    [currentPlan],
  );

  type ActionItem = {
    id: string;
    dot: string;
    title: string;
    meta: string;
    badge: string;
    badgeStyle: string;
    tab: string;
  };

  const actionItems: ActionItem[] = useMemo(() => {
    if (!currentPlan || !budgetSummary) return [];
    const items: ActionItem[] = [];
    const isOverBudget = budgetSummary.isOverAllocated;
    const isAtRisk = budgetHealth === 'at_risk';

    // Budget warning
    if (isOverBudget) {
      items.push({
        id: 'budget-over',
        dot: 'action-item-dot-danger',
        title: 'Budget over-allocated',
        meta: `${formatCurrency(budgetSummary.overAllocatedBy, currentPlan.event.currency)} more allocated than total`,
        badge: 'Over Budget',
        badgeStyle: 'action-item-badge-danger',
        tab: 'budget',
      });
    } else if (isAtRisk) {
      items.push({
        id: 'budget-risk',
        dot: 'action-item-dot-warning',
        title: 'Budget approaching limit',
        meta: `${budgetSummary.utilizationPercent}% utilized · ${formatCurrency(budgetSummary.remaining, currentPlan.event.currency)} remaining`,
        badge: 'Near Limit',
        badgeStyle: 'action-item-badge-warning',
        tab: 'budget',
      });
    }

    // Overdue tasks
    if (overdueTasks.length > 0) {
      const first = overdueTasks[0];
      items.push({
        id: `overdue-${first.id}`,
        dot: 'action-item-dot-danger',
        title: first.title,
        meta: `${overdueTasks.length > 1 ? `+${overdueTasks.length - 1} more overdue · ` : ''}was due ${Math.abs(first.daysUntilDeadline ?? 0)} days ago`,
        badge: 'Overdue',
        badgeStyle: 'action-item-badge-danger',
        tab: 'tasks',
      });
    }

    // Urgent AI recommendations
    const urgentRecsItems = currentPlan.recommendations.filter((r) => r.priority === 'urgent' && !r.dismissed);
    if (urgentRecsItems.length > 0) {
      items.push({
        id: `rec-${urgentRecsItems[0].id}`,
        dot: 'action-item-dot-warning',
        title: urgentRecsItems[0].title,
        meta: `${urgentRecsItems.length > 1 ? `${urgentRecsItems.length} urgent AI insights · ` : ''}${urgentRecsItems[0].suggestedAction.slice(0, 60)}`,
        badge: 'Urgent',
        badgeStyle: 'action-item-badge-warning',
        tab: 'recommendations',
      });
    }

    // Upcoming critical tasks
    const criticalSoon = soonTasks.filter((t) => t.priority === 'critical').slice(0, 1);
    if (criticalSoon.length > 0 && overdueTasks.length === 0) {
      const t = criticalSoon[0];
      items.push({
        id: `soon-${t.id}`,
        dot: 'action-item-dot-warning',
        title: t.title,
        meta: `${t.category} · due in ${t.daysUntilDeadline} day${t.daysUntilDeadline !== 1 ? 's' : ''}`,
        badge: 'Due Soon',
        badgeStyle: 'action-item-badge-warning',
        tab: 'timeline',
      });
    }

    // Unconfirmed vendors
    if (unconfirmedVendors.length > 0 && items.length < 4) {
      items.push({
        id: 'vendors-pending',
        dot: 'action-item-dot-info',
        title: `${unconfirmedVendors.length} vendor${unconfirmedVendors.length > 1 ? 's' : ''} not yet confirmed`,
        meta: unconfirmedVendors.slice(0, 3).map((v) => v.category).join(', '),
        badge: 'Pending',
        badgeStyle: 'action-item-badge-muted',
        tab: 'vendors',
      });
    }

    return items;
  }, [
    currentPlan,
    budgetSummary,
    budgetHealth,
    overdueTasks,
    soonTasks,
    unconfirmedVendors,
  ]);

  const allClear = actionItems.length === 0;

  // "Next best action" — top upcoming critical task not overdue
  const nextAction = useMemo(() => {
    if (!currentPlan) return undefined;
    return (
      currentPlan.tasks
        .filter((t) => t.status !== 'completed' && !t.isOverdue && t.priority === 'critical')
        .sort((a, b) => (a.daysUntilDeadline ?? 999) - (b.daysUntilDeadline ?? 999))[0] ??
      soonTasks[0]
    );
  }, [currentPlan, soonTasks]);

  if (!state.isHydrated || !state.currentPlan || !budgetSummary || !taskStats) {
    return (
      <div className={styles.loading} aria-live="polite" aria-busy="true">
        <div className="spinner" aria-hidden="true" />
        <span>Loading your plan...</span>
        <span className={styles.loadingLabel}>Preparing your event workspace</span>
      </div>
    );
  }

  const { event } = state.currentPlan;

  return (
    <div className={styles.dashboard}>
      {/* ---- Sidebar ---- */}
      <aside className={styles.sidebar} aria-label="Navigation">
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>
            <span aria-hidden="true">✦</span>
            <span>Eventique</span>
          </div>
        </div>

        <div className={styles.eventBadge}>
          <div className={styles.eventBadgeEmoji} aria-hidden="true">
            {EVENT_TYPE_ICON[event.type]}
          </div>
          <div className={styles.eventBadgeInfo}>
            <div className={styles.eventBadgeName}>{event.name}</div>
            <div className={styles.eventBadgeMeta}>
              {daysUntilEvent > 0 ? `${daysUntilEvent} days away` : 'Event passed'}
            </div>
          </div>
        </div>

        <nav className={styles.sidebarNav} role="tablist" aria-label="Dashboard sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              tabIndex={activeTab === tab.id ? 0 : -1}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ''}`}
              onClick={() => setTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
            >
              <span className={styles.navIcon} aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'recommendations' && urgentRecs > 0 && (
                <span className={styles.urgentBadge} aria-label={`${urgentRecs} urgent recommendations`}>
                  {urgentRecs}
                </span>
              )}
              {tab.id === 'tasks' && taskStats.overdue > 0 && (
                <span className={styles.urgentBadge} aria-label={`${taskStats.overdue} overdue tasks`}>
                  {taskStats.overdue}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            id="ai-generate-btn"
            className={`btn btn-primary ${styles.generateBtn}`}
            onClick={generateAIPlan}
            disabled={isGeneratingAI}
            aria-label="Generate AI-powered plan recommendations"
          >
            {isGeneratingAI ? (
              <><span className="spinner" aria-hidden="true" /> Generating...</>
            ) : (
              <><span aria-hidden="true">✦</span> {aiGenerated ? 'Refresh AI Plan' : 'Generate AI Plan'}</>
            )}
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push('/')}
            aria-label="Back to home"
          >
            ← All Events
          </button>
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main className={styles.main} id="main-content">
        <h1 className="sr-only">{event.name} — {TABS.find((t) => t.id === activeTab)?.label ?? 'Overview'}</h1>

        {/* ---- Slim top bar: active tab label + chat toggle ---- */}
        <div className={styles.topHeader}>
          <div className={styles.topHeaderLeft}>
            <span className={styles.topHeaderBreadcrumb}>
              {EVENT_TYPE_ICON[event.type]}&nbsp;
              <strong>{event.name}</strong>
              <span style={{ color: 'var(--color-border-active)', margin: '0 4px' }}>›</span>
              {TABS.find((t) => t.id === activeTab)?.label ?? 'Overview'}
            </span>
          </div>

          <div className={styles.topHeaderRight}>
            {/* Compact progress pill */}
            <div
              className={styles.progressPill}
              aria-label={`Planning progress: ${progress}%`}
              title={`${taskStats.completed} of ${taskStats.total} tasks complete`}
            >
              <div className={styles.progressPillBar} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className={styles.progressPillFill} style={{ width: `${progress}%` }} />
              </div>
              <span>{progress}%</span>
            </div>

            {/* Chat toggle */}
            <button
              id="chat-toggle-btn"
              className={`btn btn-secondary btn-sm ${styles.chatToggle}`}
              onClick={() => setIsChatOpen((v) => !v)}
              aria-label={isChatOpen ? 'Close AI assistant' : 'Open AI assistant'}
              aria-expanded={isChatOpen}
            >
              <span aria-hidden="true">✦</span>
              AI Chat
            </button>
          </div>
        </div>

        {/* ---- Error banner ---- */}
        {state.error && (
          <div className={styles.errorBanner} role="alert" aria-live="assertive">
            <span>⚠ {state.error}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* ---- Hero event header — shown only on overview tab ---- */}
        {activeTab === 'overview' && (
          <header className="dash-hero" aria-label="Event summary">
            <div className="dash-hero-greeting" aria-hidden="true">YOUR EVENT</div>
            <h1 className="dash-hero-event-name">{event.name}</h1>
            <div className="dash-hero-meta" aria-label="Event details">
              <span>{EVENT_TYPE_ICON[event.type]} {EVENT_TYPE_LABEL[event.type]}</span>
              <span className="dash-hero-meta-sep">·</span>
              <span>
                {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="dash-hero-meta-sep">·</span>
              <span>{event.location}</span>
            </div>
            <div className="dash-hero-stats" aria-label="Event key figures">
              <div className="dash-hero-stat">
                <span
                  className={`dash-hero-stat-value ${daysUntilEvent < 30 ? 'dash-hero-stat-value-danger' : daysUntilEvent < 60 ? 'dash-hero-stat-value-warning' : ''}`}
                  aria-label={`${daysUntilEvent} days remaining`}
                >
                  {daysUntilEvent > 0 ? daysUntilEvent : '—'}
                </span>
                <span className="dash-hero-stat-label">Days Remaining</span>
              </div>
              <div className="dash-hero-stat">
                <span className="dash-hero-stat-value" aria-label={`${event.guestCount} guests`}>
                  {event.guestCount.toLocaleString()}
                </span>
                <span className="dash-hero-stat-label">Guests</span>
              </div>
              <div className="dash-hero-stat">
                <span
                  className={`dash-hero-stat-value ${budgetHealth === 'over_budget' ? 'dash-hero-stat-value-danger' : budgetHealth === 'at_risk' ? 'dash-hero-stat-value-warning' : ''}`}
                  aria-label={`Total budget: ${formatCurrency(event.totalBudget, event.currency)}`}
                >
                  {formatCurrency(event.totalBudget, event.currency)}
                </span>
                <span className="dash-hero-stat-label">Total Budget</span>
              </div>
              <div className="dash-hero-stat">
                <span className="dash-hero-stat-value" aria-label={`${progress}% planning complete`}>
                  {progress}%
                </span>
                <span className="dash-hero-stat-label">Complete</span>
              </div>
            </div>
          </header>
        )}

        {/* ---- Dashboard body ---- */}
        <div className={`${styles.dashboardBody} ${isChatOpen ? styles.dashboardBodyWithChat : ''}`}>

          {/* ---- Tab content ---- */}
          <div className={styles.tabContent}>

            {/* Mobile tab strip */}
            <div className={styles.mobileTabs} role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setTab(tab.id)}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ---- Action Center — only on overview tab, injected before OverviewPanel ---- */}
            {activeTab === 'overview' && (
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <div
                  className="action-center"
                  role="region"
                  aria-label={allClear ? 'All planning items on track' : `${actionItems.length} items need your attention`}
                >
                  <div className={`action-center-header ${allClear ? 'action-center-header-safe' : ''}`}>
                    <span className={`action-center-label ${allClear ? 'action-center-label-safe' : ''}`}>
                      <span aria-hidden="true">{allClear ? '✓' : '⚑'}</span>
                      {allClear
                        ? 'All items on track'
                        : `${actionItems.length} item${actionItems.length !== 1 ? 's' : ''} need${actionItems.length === 1 ? 's' : ''} attention`}
                    </span>
                    {!allClear && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        onClick={() => setTab('tasks')}
                        aria-label="Review all priority tasks"
                      >
                        Review Priorities →
                      </button>
                    )}
                  </div>

                  {allClear ? (
                    <div className="action-item" style={{ padding: 'var(--space-4) var(--space-5)' }}>
                      <span className="action-item-dot action-item-dot-success" aria-hidden="true" />
                      <div className="action-item-content">
                        <div className="action-item-title">Planning is progressing well</div>
                        <div className="action-item-meta">
                          {taskStats.completed} tasks completed · {taskStats.total - taskStats.completed} remaining · {formatCurrency(budgetSummary.remaining, event.currency)} budget available
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="action-center-items" role="list">
                      {actionItems.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          className="action-item"
                          role="listitem"
                          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                          onClick={() => setTab(item.tab)}
                          aria-label={`${item.title} — ${item.meta}. Go to ${item.tab} tab.`}
                        >
                          <span className={`action-item-dot ${item.dot}`} aria-hidden="true" />
                          <div className="action-item-content">
                            <div className="action-item-title">{item.title}</div>
                            <div className="action-item-meta">{item.meta}</div>
                          </div>
                          <span className={`action-item-badge ${item.badgeStyle}`}>{item.badge}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Next best action */}
                {nextAction && !allClear && (
                  <div className="next-action-card" style={{ marginTop: 'var(--space-3)' }}>
                    <div className="next-action-eyebrow">Next Best Action</div>
                    <div className="next-action-title">{nextAction.title}</div>
                    <div className="next-action-reason">
                      {nextAction.category} ·{' '}
                      {nextAction.daysUntilDeadline !== undefined && nextAction.daysUntilDeadline >= 0
                        ? `Due in ${nextAction.daysUntilDeadline} day${nextAction.daysUntilDeadline !== 1 ? 's' : ''}`
                        : `${Math.abs(nextAction.daysUntilDeadline ?? 0)} days overdue`}
                      {' '}— prioritized based on your event timeline.
                    </div>
                    <div>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setTab('tasks')}
                        style={{ fontSize: '0.75rem' }}
                      >
                        View in Tasks →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Panel content */}
            <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0} style={{ outline: 'none' }}>
              {activeTab === 'overview' && <OverviewPanel />}
              {activeTab === 'budget' && <BudgetPanel />}
              {activeTab === 'timeline' && <TimelinePanel />}
              {activeTab === 'tasks' && <TasksPanel />}
              {activeTab === 'vendors' && <VendorsPanel />}
              {activeTab === 'recommendations' && <RecommendationsPanel onGenerateAI={generateAIPlan} isGenerating={isGeneratingAI} />}
              {activeTab === 'scenarios' && <ScenariosPanel />}
            </div>
          </div>

          {/* Chat panel */}
          {isChatOpen && (
            <div className={styles.chatPanelWrapper} aria-label="AI Chat assistant">
              <ChatPanel onClose={() => setIsChatOpen(false)} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
