'use client';

import { useState } from 'react';
import { useEventContext } from '@/context/EventContext';
import {
  calculateBudgetSummary,
  formatCurrency,
  getBudgetHealthStatus,
} from '@/lib/engines/budget-engine';
import styles from './panels.module.css';

export default function BudgetPanel() {
  const { state, dispatch } = useEventContext();
  const { currentPlan } = state;
  const [editingTotal, setEditingTotal] = useState(false);
  const [newTotal, setNewTotal] = useState(currentPlan ? currentPlan.event.totalBudget.toString() : '0');
  const [editingCat, setEditingCat] = useState<Record<string, string>>({});

  if (!currentPlan) return null;

  const { event, budget } = currentPlan;
  const summary = calculateBudgetSummary(budget, event.totalBudget);
  const health = getBudgetHealthStatus(summary);

  const handleTotalSave = () => {
    const parsed = Number(newTotal);
    if (isNaN(parsed) || parsed < 0) return;
    dispatch({ type: 'UPDATE_EVENT', payload: { totalBudget: parsed } });
    setEditingTotal(false);
  };

  const handleCatChange = (id: string, val: string) => {
    setEditingCat((prev) => ({ ...prev, [id]: val }));
  };

  const handleCatSave = (id: string) => {
    const val = Number(editingCat[id]);
    if (!isNaN(val) && val >= 0) {
      dispatch({ type: 'UPDATE_BUDGET_CATEGORY', payload: { categoryId: id, allocated: val } });
    }
    setEditingCat((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSpentChange = (id: string, spent: number) => {
    dispatch({ type: 'UPDATE_BUDGET_SPENT', payload: { categoryId: id, spent } });
  };

  return (
    <section className={styles.panel} aria-labelledby="budget-heading">
      <div className={styles.panelHeader}>
        <h2 id="budget-heading" className={styles.panelTitle}>Budget Management</h2>
        <div className="flex gap-2 items-center">
          {health === 'over_budget' && <span className="badge badge-danger">Over Budget!</span>}
          {health === 'at_risk' && <span className="badge badge-warning">Near Limit</span>}
          {health === 'healthy' && <span className="badge badge-success">✓ Healthy</span>}
        </div>
      </div>

      {/* Budget summary */}
      <div className={styles.budgetSummaryCards}>
        {[
          { label: 'Total Budget', value: summary.total, color: '' },
          { label: 'Allocated', value: summary.allocated, color: summary.isOverAllocated ? 'text-danger' : '' },
          { label: 'Spent', value: summary.spent, color: '' },
          { label: 'Remaining', value: summary.remaining, color: summary.remaining < 0 ? 'text-danger' : 'text-success' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.color}`}>{formatCurrency(s.value, event.currency)}</div>
          </div>
        ))}
      </div>

      {/* Elevated Budget Health Meter */}
      <div className={styles.budgetHealthBox} role="region" aria-label="Budget Health Indicator">
        <div className={styles.budgetHealthHeader}>
          <span>Budget Health</span>
          <span style={{ color: health === 'over_budget' ? 'var(--color-danger)' : health === 'at_risk' ? 'var(--color-warning)' : 'var(--color-success)' }}>
            {summary.total > 0 ? Math.round((summary.allocated / summary.total) * 100) : 0}% Allocated
          </span>
        </div>
        <div className={styles.budgetHealthTrack} role="progressbar" aria-valuenow={summary.total > 0 ? Math.min(100, Math.round((summary.allocated / summary.total) * 100)) : 0} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={styles.budgetHealthBar}
            style={{
              width: `${Math.min(100, summary.total > 0 ? (summary.allocated / summary.total) * 100 : 0)}%`,
              background: health === 'over_budget' ? 'var(--color-danger)' : health === 'at_risk' ? 'var(--color-warning)' : 'var(--color-brand)',
            }}
          />
        </div>
        <div className={styles.budgetHealthMeta}>
          <span>
            {formatCurrency(summary.remaining, event.currency)} remaining of {formatCurrency(summary.total, event.currency)}
          </span>
          <span>
            {summary.utilizationPercent}% spent to date
          </span>
        </div>
      </div>

      {summary.isOverAllocated && (
        <div className="alert alert-danger" role="alert">
          <span aria-hidden="true">🚨</span>
          <div>
            <strong>Over-allocated by {formatCurrency(summary.overAllocatedBy, event.currency)}</strong>
            <p className="text-sm mt-1">Reduce category allocations below, or increase your total budget.</p>
          </div>
        </div>
      )}

      {/* Edit total budget */}
      <div className={styles.section}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={styles.sectionTitle}>Total Budget</h3>
          {!editingTotal ? (
            <button
              id="edit-total-budget-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => { setNewTotal(event.totalBudget.toString()); setEditingTotal(true); }}
              aria-label="Edit total budget"
            >
              ✏️ Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button className="btn btn-success btn-sm" onClick={handleTotalSave}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingTotal(false)}>Cancel</button>
            </div>
          )}
        </div>

        {editingTotal ? (
          <div className="flex items-center gap-3">
            <span className="font-semibold text-muted">{event.currency}</span>
            <input
              id="total-budget-input"
              type="number"
              value={newTotal}
              min={0}
              onChange={(e) => setNewTotal(e.target.value)}
              style={{ maxWidth: 240 }}
              aria-label="New total budget amount"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="stat-value">{formatCurrency(event.totalBudget, event.currency)}</span>
            <span className="text-sm text-muted">for {event.guestCount} guests</span>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className={styles.budgetTable}>
        <table aria-label="Budget category breakdown">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" style={{ textAlign: 'right' }}>Allocated</th>
              <th scope="col" style={{ textAlign: 'right' }}>%</th>
              <th scope="col" style={{ textAlign: 'right' }}>Spent</th>
              <th scope="col" style={{ textAlign: 'right' }}>Remaining</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {budget.categories.map((cat) => {
              const pct = summary.total > 0 ? ((cat.allocated / summary.total) * 100).toFixed(1) : '0';
              const remaining = cat.allocated - cat.spent;
              const isEditing = cat.id in editingCat;

              return (
                <tr key={cat.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {cat.name}
                      {cat.isLocked && <span className="badge badge-muted" title="Locked">🔒</span>}
                      {cat.aiSuggested && (
                        <span className="ai-badge" title="AI suggested">
                          <span className="ai-pulse" aria-hidden="true" />
                          AI
                        </span>
                      )}
                    </div>
                    {cat.notes && <div className="text-xs text-muted mt-1">{cat.notes.slice(0, 80)}</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        className={styles.categoryInput}
                        value={editingCat[cat.id]}
                        min={0}
                        onChange={(e) => handleCatChange(cat.id, e.target.value)}
                        onBlur={() => handleCatSave(cat.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCatSave(cat.id)}
                        aria-label={`Allocated amount for ${cat.name}`}
                        autoFocus
                      />
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}
                        onClick={() => !cat.isLocked && handleCatChange(cat.id, cat.allocated.toString())}
                        disabled={cat.isLocked}
                        aria-label={`Edit ${cat.name} allocation: ${formatCurrency(cat.allocated, event.currency)}`}
                      >
                        {formatCurrency(cat.allocated, event.currency)}
                      </button>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{pct}%</td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      className={styles.categoryInput}
                      value={cat.spent}
                      min={0}
                      max={cat.allocated * 2}
                      style={{ width: 120 }}
                      onChange={(e) => handleSpentChange(cat.id, Number(e.target.value))}
                      aria-label={`Amount spent in ${cat.name}`}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={remaining < 0 ? 'text-danger font-bold' : ''}>
                      {formatCurrency(remaining, event.currency)}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-ghost btn-sm"
                        aria-label={cat.isLocked ? `Unlock ${cat.name}` : `Lock ${cat.name}`}
                        title={cat.isLocked ? 'Unlock' : 'Lock'}
                        onClick={() => {
                          const updatedCats = budget.categories.map((c) =>
                            c.id === cat.id ? { ...c, isLocked: !c.isLocked } : c
                          );
                          dispatch({ type: 'SET_PLAN', payload: { ...currentPlan, budget: { ...budget, categories: updatedCats } } });
                        }}
                      >
                        {cat.isLocked ? '🔓' : '🔒'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--color-bg-input)' }}>
              <td><strong>TOTAL</strong></td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: summary.isOverAllocated ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                {formatCurrency(summary.allocated, event.currency)}
              </td>
              <td style={{ textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>100%</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(summary.spent, event.currency)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: summary.remaining < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {formatCurrency(summary.remaining, event.currency)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Contingency note */}
      <div className="alert alert-info">
        <span aria-hidden="true">💡</span>
        <div>
          <strong>Industry Tip:</strong> Keep 5-10% as contingency.
          Recommended contingency for your event: {formatCurrency(Math.round(event.totalBudget * 0.07), event.currency)}
        </div>
      </div>
    </section>
  );
}
