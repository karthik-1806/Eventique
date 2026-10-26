'use client';

import { useState } from 'react';
import { useEventContext } from '@/context/EventContext';
import { getTaskStats, getDaysUntilEvent } from '@/lib/engines/timeline-engine';
import type { Task, TaskStatus, TaskPriority } from '@/lib/models/types';
import styles from './panels.module.css';

const STATUS_OPTIONS: TaskStatus[] = ['not_started', 'in_progress', 'completed', 'blocked'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
};
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'badge-danger',
  high: 'badge-warning',
  medium: 'badge-info',
  low: 'badge-muted',
};

export default function TimelinePanel() {
  const { state, dispatch } = useEventContext();
  const [filter, setFilter] = useState<'all' | TaskStatus | 'overdue'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');

  const { currentPlan } = state;
  if (!currentPlan) return null;

  const { tasks, event } = currentPlan;
  const stats = getTaskStats(tasks);
  const daysUntilEvent = getDaysUntilEvent(event.date);

  const filtered = tasks.filter((t) => {
    if (filter === 'overdue') return t.isOverdue && t.status !== 'completed';
    if (filter !== 'all' && t.status !== filter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    // Sort: overdue first, then by days until deadline
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return (a.daysUntilDeadline ?? 9999) - (b.daysUntilDeadline ?? 9999);
  });

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId, status: newStatus } });
  };

  const renderTimelineItem = (task: Task) => {
    const dotClass = task.status === 'completed' ? styles.timelineDotCompleted :
      task.isOverdue ? styles.timelineDotOverdue :
      task.status === 'in_progress' ? styles.timelineDotInProgress :
      task.priority === 'critical' ? styles.timelineDotCritical :
      '';

    return (
      <div key={task.id} className={styles.timelineItem}>
        <div className={`${styles.timelineDot} ${dotClass}`} aria-hidden="true" />
        <div className={styles.timelineContent}>
          <div className="flex items-start justify-between gap-3">
            <div className={`${styles.timelineTitle} ${task.status === 'completed' ? 'text-muted' : ''}`}
              style={task.status === 'completed' ? { textDecoration: 'line-through' } : {}}>
              {task.title}
            </div>
            <div className="flex gap-2 items-center flex-wrap" style={{ flexShrink: 0 }}>
              <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                style={{ fontSize: '0.8rem', padding: '3px 8px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
                aria-label={`Status for ${task.title}`}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.timelineMeta}>
            <span>{task.category}</span>
            <span aria-hidden="true">·</span>
            <span>Due: {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {task.isOverdue && task.status !== 'completed' && (
              <span className="text-danger">⚠ {Math.abs(task.daysUntilDeadline ?? 0)} days overdue</span>
            )}
            {!task.isOverdue && task.daysUntilDeadline !== undefined && task.status !== 'completed' && (
              <span className={task.daysUntilDeadline < 14 ? 'text-warning' : 'text-muted'}>
                in {task.daysUntilDeadline} day{task.daysUntilDeadline !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className={styles.panel} aria-labelledby="timeline-heading">
      <div className={styles.panelHeader}>
        <h2 id="timeline-heading" className={styles.panelTitle}>Planning Timeline</h2>
        <span className="text-sm text-muted">{daysUntilEvent > 0 ? `${daysUntilEvent} days to event` : 'Event passed'}</span>
      </div>

      {/* Stats row */}
      <div className={styles.kpiGrid} role="list" aria-label="Task statistics">
        {[
          { label: 'Total Tasks', value: stats.total, color: '' },
          { label: 'Completed', value: stats.completed, color: 'text-success' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-info' },
          { label: 'Overdue', value: stats.overdue, color: stats.overdue > 0 ? 'text-danger' : '' },
          { label: 'Blocked', value: stats.blocked, color: stats.blocked > 0 ? 'text-danger' : '' },
          { label: 'Critical Pending', value: stats.critical, color: stats.critical > 0 ? 'text-warning' : '' },
        ].map((s) => (
          <div key={s.label} className="stat-card" role="listitem">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div>
        <div className={styles.filterBar} role="group" aria-label="Filter tasks by status">
          {(['all', 'overdue', ...STATUS_OPTIONS] as const).map((f) => (
            <button
              key={f}
              className={`${styles.filterChip} ${filter === f ? styles.filterChipActive : ''}`}
              onClick={() => setFilter(f as typeof filter)}
              aria-pressed={filter === f}
            >
              {f === 'all' ? 'All' : f === 'overdue' ? `⚠ Overdue (${stats.overdue})` : STATUS_LABELS[f as TaskStatus]}
            </button>
          ))}
        </div>
        <div className={styles.filterBar} role="group" aria-label="Filter tasks by priority">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              className={`${styles.filterChip} ${priorityFilter === p ? styles.filterChipActive : ''}`}
              onClick={() => setPriorityFilter(p)}
              aria-pressed={priorityFilter === p}
            >
              {p === 'all' ? 'All priorities' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline with operational hierarchy */}
      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">📅</div>
          <div className="empty-state-title">No tasks match this filter</div>
          <div className="empty-state-desc">Try a different status or priority filter</div>
        </div>
      ) : filter !== 'all' ? (
        <div className={styles.timelineList} aria-label="Task timeline">
          {sorted.map((task) => renderTimelineItem(task))}
        </div>
      ) : (
        <div>
          {/* Overdue Section */}
          {sorted.filter((t) => t.isOverdue && t.status !== 'completed').length > 0 && (
            <div>
              <div className={styles.timelineSectionHeader} style={{ color: 'var(--color-danger)' }}>
                <span>🚨</span> Overdue Tasks ({sorted.filter((t) => t.isOverdue && t.status !== 'completed').length})
              </div>
              <div className={styles.timelineList}>
                {sorted.filter((t) => t.isOverdue && t.status !== 'completed').map(renderTimelineItem)}
              </div>
            </div>
          )}

          {/* Up Next Section */}
          {sorted.filter((t) => !t.isOverdue && t.status !== 'completed' && ((t.daysUntilDeadline ?? 999) <= 14 || t.status === 'in_progress')).length > 0 && (
            <div>
              <div className={styles.timelineSectionHeader} style={{ color: 'var(--color-brand)' }}>
                <span>⏳</span> Up Next (Next 14 Days)
              </div>
              <div className={styles.timelineList}>
                {sorted.filter((t) => !t.isOverdue && t.status !== 'completed' && ((t.daysUntilDeadline ?? 999) <= 14 || t.status === 'in_progress')).map(renderTimelineItem)}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {sorted.filter((t) => !t.isOverdue && t.status !== 'completed' && (t.daysUntilDeadline ?? 999) > 14 && t.status !== 'in_progress').length > 0 && (
            <div>
              <div className={styles.timelineSectionHeader}>
                <span>📋</span> Later Milestones
              </div>
              <div className={styles.timelineList}>
                {sorted.filter((t) => !t.isOverdue && t.status !== 'completed' && (t.daysUntilDeadline ?? 999) > 14 && t.status !== 'in_progress').map(renderTimelineItem)}
              </div>
            </div>
          )}

          {/* Completed Section */}
          {sorted.filter((t) => t.status === 'completed').length > 0 && (
            <div>
              <div className={styles.timelineSectionHeader} style={{ color: 'var(--color-success)' }}>
                <span>✓</span> Completed ({sorted.filter((t) => t.status === 'completed').length})
              </div>
              <div className={styles.timelineList}>
                {sorted.filter((t) => t.status === 'completed').map(renderTimelineItem)}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
