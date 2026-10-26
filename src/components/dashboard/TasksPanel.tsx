'use client';

import { useState } from 'react';
import { useEventContext } from '@/context/EventContext';
import { getTaskStats } from '@/lib/engines/timeline-engine';
import type { TaskStatus, TaskPriority } from '@/lib/models/types';
import styles from './panels.module.css';

const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
};

export default function TasksPanel() {
  const { state, dispatch } = useEventContext();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('pending');
  const { currentPlan } = state;
  if (!currentPlan) return null;

  const { tasks } = currentPlan;
  const stats = getTaskStats(tasks);

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'overdue') return t.isOverdue && t.status !== 'completed';
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId, status } });
  };

  const getBadgeClass = (priority: TaskPriority) => {
    const map: Record<TaskPriority, string> = { critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', low: 'badge-muted' };
    return map[priority];
  };

  return (
    <section className={styles.panel} aria-labelledby="tasks-heading">
      <div className={styles.panelHeader}>
        <h2 id="tasks-heading" className={styles.panelTitle}>Tasks</h2>
        <span className="text-sm text-muted">{stats.completionPercent}% complete</span>
      </div>

      {/* Progress */}
      <div className="progress-bar-track" style={{ height: 8 }} role="progressbar" aria-valuenow={stats.completionPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`${stats.completionPercent}% of tasks complete`}>
        <div className="progress-bar-fill" style={{ width: `${stats.completionPercent}%` }} />
      </div>

      {/* Filters */}
      <div className={styles.filterBar} role="group" aria-label="Filter tasks">
        {([
          { id: 'pending', label: `Pending (${stats.total - stats.completed})` },
          { id: 'overdue', label: `⚠ Overdue (${stats.overdue})` },
          { id: 'completed', label: `✓ Done (${stats.completed})` },
          { id: 'all', label: `All (${stats.total})` },
        ] as const).map((f) => (
          <button
            key={f.id}
            className={`${styles.filterChip} ${filter === f.id ? styles.filterChipActive : ''}`}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">✅</div>
          <div className="empty-state-title">
            {filter === 'completed' ? 'No completed tasks yet' : 'No tasks match this filter'}
          </div>
        </div>
      ) : (
        <div className={styles.taskList} role="list" aria-label="Task list">
          {sorted.map((task) => (
            <div
              key={task.id}
              className={`${styles.taskItem} ${task.isOverdue && task.status !== 'completed' ? styles.taskItemOverdue : ''} ${task.status === 'completed' ? styles.taskItemCompleted : ''}`}
              role="listitem"
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                id={`task-check-${task.id}`}
                checked={task.status === 'completed'}
                onChange={(e) => handleStatusChange(task.id, e.target.checked ? 'completed' : 'not_started')}
                style={{ width: 16, height: 16, flexShrink: 0, accentColor: 'var(--color-brand)', cursor: 'pointer' }}
                aria-label={`Mark "${task.title}" as ${task.status === 'completed' ? 'incomplete' : 'complete'}`}
              />

              <div className={styles.taskInfo} style={{ flex: 1, minWidth: 0 }}>
                <span className={`${styles.taskTitle} ${task.status === 'completed' ? styles.taskTitleCompleted : ''}`}>
                  {task.title}
                </span>
                <span className={styles.taskMeta}>
                  {task.category}
                  {task.isOverdue && task.status !== 'completed' && <span className="text-danger"> · {Math.abs(task.daysUntilDeadline ?? 0)}d overdue</span>}
                  {!task.isOverdue && task.daysUntilDeadline !== undefined && task.status !== 'completed' && <span> · due in {task.daysUntilDeadline}d</span>}
                  {task.status === 'completed' && <span className="text-success"> · ✓ Done</span>}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`badge ${getBadgeClass(task.priority)}`}>{task.priority}</span>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                  style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
                  aria-label={`Change status of ${task.title}`}
                >
                  {(['not_started', 'in_progress', 'completed', 'blocked'] as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
