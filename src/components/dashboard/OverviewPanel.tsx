'use client';

import { useMemo } from 'react';
import { useEventContext } from '@/context/EventContext';
import { calculateBudgetSummary, formatCurrency, getBudgetHealthStatus, getPerGuestCost } from '@/lib/engines/budget-engine';
import { getTaskStats, getUpcomingTasks, getPlanningProgress } from '@/lib/engines/timeline-engine';
import styles from './panels.module.css';

const VENDOR_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  booked: 'Booked',
  contacted: 'Contacted',
  researching: 'Researching',
  cancelled: 'Cancelled',
};

const VENDOR_STATUS_COLORS: Record<string, string> = {
  confirmed: 'var(--color-success)',
  booked: 'var(--color-success)',
  contacted: 'var(--color-info)',
  researching: 'var(--color-warning)',
  cancelled: 'var(--color-danger)',
};

export default function OverviewPanel() {
  const { state, dispatch } = useEventContext();
  const { currentPlan } = state;

  const budgetSummary = useMemo(
    () => (currentPlan ? calculateBudgetSummary(currentPlan.budget, currentPlan.event.totalBudget) : null),
    [currentPlan],
  );
  const taskStats = useMemo(() => (currentPlan ? getTaskStats(currentPlan.tasks) : null), [currentPlan]);
  const upcomingTasks = useMemo(() => (currentPlan ? getUpcomingTasks(currentPlan.tasks, 14) : []), [currentPlan]);
  const overdueTasks = useMemo(
    () => (currentPlan ? currentPlan.tasks.filter((t) => t.isOverdue && t.status !== 'completed') : []),
    [currentPlan],
  );
  const progress = useMemo(() => (currentPlan ? getPlanningProgress(currentPlan.tasks) : 0), [currentPlan]);
  const budgetHealth = useMemo(
    () => (budgetSummary ? getBudgetHealthStatus(budgetSummary) : 'healthy'),
    [budgetSummary],
  );
  const activeRecs = useMemo(
    () => (currentPlan ? currentPlan.recommendations.filter((r) => !r.dismissed) : []),
    [currentPlan],
  );
  const topRec = activeRecs.find((r) => r.priority === 'urgent') ?? activeRecs[0];

  const confirmedVendors = useMemo(
    () => (currentPlan ? currentPlan.vendors.filter((v) => v.status === 'confirmed' || v.status === 'booked') : []),
    [currentPlan],
  );

  if (!currentPlan || !budgetSummary || !taskStats) return null;

  const { event, budget, vendors } = currentPlan;

  // Budget bar color
  const budgetBarClass = budgetHealth === 'over_budget' ? 'danger' : budgetHealth === 'at_risk' ? 'warning' : '';

  // Task to show in "upcoming" — prioritize overdue, then upcoming
  const priorityTasks = overdueTasks.length > 0
    ? overdueTasks.slice(0, 3)
    : upcomingTasks.slice(0, 3);

  return (
    <section className={styles.panel} aria-labelledby="overview-heading">
      {/* Screen-reader heading */}
      <h2 id="overview-heading" className="sr-only">Event Overview</h2>

      {/* ---- 2-column health grid ---- */}
      <div className="overview-grid" role="list" aria-label="Planning health metrics">

        {/* Budget Health Card */}
        <div className="health-card" role="listitem" aria-label="Budget health">
          <div className="health-card-label">
            <span aria-hidden="true">◈</span> Budget Health
          </div>

          <div>
            <div className="health-card-value" aria-label={`Total budget: ${formatCurrency(budgetSummary.total, event.currency)}`}>
              {formatCurrency(budgetSummary.total, event.currency)}
            </div>
            <div className={`health-card-sub ${
              budgetHealth === 'over_budget' ? 'health-card-sub-danger' :
              budgetHealth === 'at_risk' ? 'health-card-sub-warning' :
              'health-card-sub-success'
            }`} style={{ marginTop: 4 }}>
              {budgetHealth === 'over_budget'
                ? `⚠ Over by ${formatCurrency(budgetSummary.overAllocatedBy, event.currency)}`
                : budgetHealth === 'at_risk'
                ? `↑ ${budgetSummary.utilizationPercent}% utilized — near limit`
                : `✓ ${formatCurrency(budgetSummary.remaining, event.currency)} remaining`}
            </div>
          </div>

          {/* Budget bar */}
          <div>
            <div
              className="progress-bar-track"
              role="progressbar"
              aria-valuenow={Math.min(budgetSummary.utilizationPercent, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${budgetSummary.utilizationPercent}% of budget spent`}
            >
              <div
                className={`progress-bar-fill ${budgetBarClass}`}
                style={{ width: `${Math.min(budgetSummary.utilizationPercent, 100)}%` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span className="text-xs text-muted">
                Spent: {formatCurrency(budgetSummary.spent, event.currency)}
              </span>
              <span className="text-xs text-muted">
                Allocated: {formatCurrency(budgetSummary.allocated, event.currency)}
              </span>
            </div>
          </div>

          {/* Top 3 budget categories */}
          <div>
            <div className="section-divider-label" aria-hidden="true">Top Categories</div>
            {budget.categories.slice(0, 3).map((cat) => {
              const pct = budgetSummary.total > 0 ? Math.round((cat.allocated / budgetSummary.total) * 100) : 0;
              const spentPct = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
              return (
                <div key={cat.id} className={styles.budgetRow}>
                  <div className={styles.budgetRowHeader}>
                    <span className={styles.budgetCatName}>{cat.name}</span>
                    <span className={styles.budgetCatAmount}>
                      {formatCurrency(cat.allocated, event.currency)}
                      <span className="text-muted text-xs"> ({pct}%)</span>
                    </span>
                  </div>
                  <div className="progress-bar-track" style={{ height: 4, marginTop: 4 }}>
                    <div
                      className={`progress-bar-fill ${spentPct > 100 ? 'danger' : spentPct > 75 ? 'warning' : ''}`}
                      style={{ width: `${Math.min(spentPct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {budget.categories.length > 3 && (
              <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
                +{budget.categories.length - 3} more — see Budget tab
              </p>
            )}
          </div>
        </div>

        {/* Timeline Health Card */}
        <div className="health-card" role="listitem" aria-label="Timeline health">
          <div className="health-card-label">
            <span aria-hidden="true">◷</span> Timeline Health
          </div>

          <div>
            <div className="health-card-value" aria-label={`Planning progress: ${progress}%`}>
              {progress}%
            </div>
            <div className="health-card-sub" style={{ marginTop: 4 }}>
              {taskStats.completed} of {taskStats.total} tasks complete
              {taskStats.overdue > 0 && (
                <span className="health-card-sub-danger"> · {taskStats.overdue} overdue</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="progress-bar-track"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress}% planning complete`}
          >
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Upcoming / overdue tasks */}
          <div>
            <div className="section-divider-label" aria-hidden="true">
              {overdueTasks.length > 0 ? 'Overdue' : 'Up Next'}
            </div>
            {priorityTasks.length === 0 ? (
              <p className="text-xs text-muted">No upcoming tasks in the next 14 days.</p>
            ) : (
              <div className={styles.taskList}>
                {priorityTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`${styles.taskItem} ${task.isOverdue ? styles.taskItemOverdue : ''} ${task.status === 'completed' ? styles.taskItemCompleted : ''}`}
                  >
                    <div className={styles.taskInfo}>
                      <span className={`${styles.taskTitle} ${task.status === 'completed' ? styles.taskTitleCompleted : ''}`}>
                        {task.title}
                      </span>
                      <span className={styles.taskMeta}>
                        {task.category} ·{' '}
                        {task.isOverdue
                          ? `${Math.abs(task.daysUntilDeadline ?? 0)} days overdue`
                          : `due in ${task.daysUntilDeadline} day${task.daysUntilDeadline !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <span className={`badge ${
                      task.priority === 'critical' ? 'badge-danger' :
                      task.priority === 'high' ? 'badge-warning' :
                      'badge-muted'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {(upcomingTasks.length > 3 || overdueTasks.length > 3) && (
              <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
                See Timeline & Tasks tabs for full list
              </p>
            )}
          </div>
        </div>

        {/* Vendor Readiness Card */}
        <div className="health-card" role="listitem" aria-label="Vendor readiness">
          <div className="health-card-label">
            <span aria-hidden="true">◆</span> Vendor Readiness
          </div>

          <div>
            <div className="health-card-value health-card-value-sm">
              {confirmedVendors.length}
              <span className="text-muted" style={{ fontWeight: 400, fontSize: '1rem' }}> / {vendors.length}</span>
            </div>
            <div className={`health-card-sub ${confirmedVendors.length === vendors.length && vendors.length > 0 ? 'health-card-sub-success' : 'health-card-sub-warning'}`} style={{ marginTop: 4 }}>
              {vendors.length === 0
                ? 'No vendors added yet'
                : confirmedVendors.length === vendors.length
                ? '✓ All vendors confirmed'
                : `${vendors.length - confirmedVendors.length} pending confirmation`}
            </div>
          </div>

          {vendors.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-4) 0', gap: 'var(--space-2)' }}>
              <span className="text-xs text-muted">Generate an AI plan to get vendor suggestions</span>
            </div>
          ) : (
            <div>
              {vendors.slice(0, 5).map((vendor) => (
                <div key={vendor.id} className="vendor-readiness-row">
                  <span
                    className="vendor-dot"
                    style={{ background: VENDOR_STATUS_COLORS[vendor.status] ?? 'var(--color-text-muted)' }}
                    aria-hidden="true"
                  />
                  <span className="vendor-readiness-name">
                    {vendor.name || vendor.category}
                  </span>
                  <span
                    className="vendor-readiness-status"
                    style={{ color: VENDOR_STATUS_COLORS[vendor.status] ?? 'var(--color-text-muted)' }}
                  >
                    {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
                  </span>
                </div>
              ))}
              {vendors.length > 5 && (
                <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
                  +{vendors.length - 5} more — see Vendors tab
                </p>
              )}
            </div>
          )}
        </div>

        {/* AI Insights Card */}
        <div className="health-card" role="listitem" aria-label="AI insights">
          <div className="health-card-label" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span aria-hidden="true">✦</span> AI Insights
            </span>
            <span className="ai-badge">
              <span className="ai-pulse" aria-hidden="true" />
              {activeRecs.length} active
            </span>
          </div>

          {activeRecs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <p className="text-sm text-muted">
                No AI insights yet. Generate an AI plan to get personalized recommendations.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'recommendations' })}
                aria-label="Go to AI Insights tab"
              >
                ✦ Go to AI Insights
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Show top insight as a strip */}
              {topRec && (
                <div className="ai-insight-strip">
                  <span className="ai-insight-icon" aria-hidden="true">
                    {topRec.type === 'risk' ? '⚠' : topRec.type === 'budget' ? '◈' : topRec.type === 'timeline' ? '◷' : '✦'}
                  </span>
                  <div className="ai-insight-body">
                    <div className="ai-insight-title">{topRec.title}</div>
                    <div className="ai-insight-desc">
                      {topRec.explanation.slice(0, 120)}{topRec.explanation.length > 120 ? '…' : ''}
                    </div>
                    <div className="ai-insight-action">→ {topRec.suggestedAction.slice(0, 80)}</div>
                  </div>
                </div>
              )}

              {/* Remaining recs as a compact list */}
              {activeRecs.slice(1, 3).map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-2)',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  <span
                    className="badge"
                    style={{
                      background: rec.priority === 'urgent'
                        ? 'var(--color-danger-muted)'
                        : rec.priority === 'high'
                        ? 'var(--color-warning-muted)'
                        : 'rgba(255,255,255,0.06)',
                      color: rec.priority === 'urgent'
                        ? 'var(--color-danger)'
                        : rec.priority === 'high'
                        ? 'var(--color-warning)'
                        : 'var(--color-text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {rec.priority}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {rec.title}
                  </span>
                </div>
              ))}

              {activeRecs.length > 3 && (
                <p className="text-xs text-muted" style={{ textAlign: 'center' }}>
                  +{activeRecs.length - 3} more — see AI Insights tab
                </p>
              )}

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'recommendations' })}
                style={{ fontSize: '0.75rem', alignSelf: 'flex-start', padding: '4px 0' }}
                aria-label="View all AI insights"
              >
                View all insights →
              </button>
            </div>
          )}
        </div>

        {/* Key Stats Row — full width */}
        <div className="overview-grid-full">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 'var(--space-3)',
            }}
            role="list"
            aria-label="Secondary planning metrics"
          >
            <div className="stat-card" role="listitem">
              <div className="stat-label">Per Guest</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(getPerGuestCost(event.totalBudget, event.guestCount), event.currency)}
              </div>
              <div className="stat-delta">budget per attendee</div>
            </div>

            <div className="stat-card" role="listitem">
              <div className="stat-label">Tasks Completed</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {taskStats.completed}
                <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>
                  /{taskStats.total}
                </span>
              </div>
              <div className="stat-delta">{taskStats.critical > 0 ? `${taskStats.critical} critical remaining` : 'No critical tasks remaining'}</div>
            </div>

            <div className="stat-card" role="listitem">
              <div className="stat-label">Spent So Far</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(budgetSummary.spent, event.currency)}
              </div>
              <div className="stat-delta">of {formatCurrency(budgetSummary.total, event.currency)} total</div>
            </div>

            <div className="stat-card" role="listitem">
              <div className="stat-label">Vendors Confirmed</div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {confirmedVendors.length}
                <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>
                  /{vendors.length}
                </span>
              </div>
              <div className={`stat-delta ${confirmedVendors.length === vendors.length && vendors.length > 0 ? 'text-success' : ''}`}>
                {vendors.length === 0 ? 'No vendors yet' : confirmedVendors.length === vendors.length ? '✓ All confirmed' : `${vendors.length - confirmedVendors.length} pending`}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
