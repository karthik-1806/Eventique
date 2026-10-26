'use client';

import { useState } from 'react';
import { useEventContext } from '@/context/EventContext';
import { formatCurrency } from '@/lib/engines/budget-engine';
import { buildScenario } from '@/lib/engines/scenario-engine';
import type { ScenarioChange } from '@/lib/models/types';
import styles from './panels.module.css';

export default function ScenariosPanel() {
  const { state, dispatch, getEventContext } = useEventContext();
  const { currentPlan } = state;

  // Simulator state
  const [customBudgetPercent, setCustomBudgetPercent] = useState<number>(-15);
  const [customGuestDelta, setCustomGuestDelta] = useState<number>(0);
  const [isSimulatingAI, setIsSimulatingAI] = useState(false);

  if (!currentPlan) return null;

  const { event, budget, scenarios } = currentPlan;

  // Quick preset handlers
  const handleCreatePresetScenario = async (type: string) => {
    let scenarioName = '';
    let scenarioDesc = '';
    const changes: ScenarioChange[] = [];

    if (type === 'budget_cut_15') {
      scenarioName = '15% Budget Optimization';
      const targetBudget = Math.round(event.totalBudget * 0.85);
      scenarioDesc = `Streamline overall budget from ${formatCurrency(event.totalBudget, event.currency)} to ${formatCurrency(targetBudget, event.currency)}`;
      changes.push({
        field: 'totalBudget',
        from: event.totalBudget,
        to: targetBudget,
        reason: 'Cost reduction target',
      });
    } else if (type === 'budget_cut_25') {
      scenarioName = 'Austerity (25% Cut)';
      const targetBudget = Math.round(event.totalBudget * 0.75);
      scenarioDesc = `Aggressive 25% cost reduction down to ${formatCurrency(targetBudget, event.currency)}`;
      changes.push({
        field: 'totalBudget',
        from: event.totalBudget,
        to: targetBudget,
        reason: 'Major budget reduction',
      });
    } else if (type === 'guest_increase_25') {
      scenarioName = 'Guest List Expansion (+25%)';
      const targetGuests = Math.round(event.guestCount * 1.25);
      scenarioDesc = `Expand guest count from ${event.guestCount} to ${targetGuests}`;
      changes.push({
        field: 'guestCount',
        from: event.guestCount,
        to: targetGuests,
        reason: 'Accommodate extended friends & family',
      });
    } else if (type === 'guest_decrease_20') {
      scenarioName = 'Intimate Gathering (-20% Guests)';
      const targetGuests = Math.max(10, Math.round(event.guestCount * 0.8));
      scenarioDesc = `Scale down guest count from ${event.guestCount} to ${targetGuests} for closer circles`;
      changes.push({
        field: 'guestCount',
        from: event.guestCount,
        to: targetGuests,
        reason: 'Downsize for intimacy and cost savings',
      });
    }

    const newScenario = buildScenario(
      event.id,
      scenarioName,
      scenarioDesc,
      changes,
      budget,
      event
    );

    dispatch({ type: 'ADD_SCENARIO', payload: newScenario });
  };

  const handleApplyScenario = (scenarioId: string) => {
    dispatch({ type: 'APPLY_SCENARIO', payload: scenarioId });
  };

  const handleCustomSimulate = async () => {
    const changes: ScenarioChange[] = [];
    const name = 'Custom What-If Scenario';
    const descParts: string[] = [];

    if (customBudgetPercent !== 0) {
      const targetBudget = Math.max(1000, Math.round(event.totalBudget * (1 + customBudgetPercent / 100)));
      changes.push({
        field: 'totalBudget',
        from: event.totalBudget,
        to: targetBudget,
        reason: `${customBudgetPercent > 0 ? '+' : ''}${customBudgetPercent}% budget adjustment`,
      });
      descParts.push(`Budget changed by ${customBudgetPercent}%`);
    }

    if (customGuestDelta !== 0) {
      const targetGuests = Math.max(5, event.guestCount + customGuestDelta);
      changes.push({
        field: 'guestCount',
        from: event.guestCount,
        to: targetGuests,
        reason: `${customGuestDelta > 0 ? '+' : ''}${customGuestDelta} guests adjustment`,
      });
      descParts.push(`Guests changed by ${customGuestDelta}`);
    }

    if (changes.length === 0) return;

    const newScenario = buildScenario(
      event.id,
      name,
      descParts.join(' & '),
      changes,
      budget,
      event
    );

    // AI Explanation call
    setIsSimulatingAI(true);
    try {
      const ctx = getEventContext();
      if (ctx) {
        const res = await fetch('/api/ai/scenario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventContext: ctx,
            scenarioName: newScenario.name,
            changes: newScenario.changes,
            calculatedImpact: {
              financialDelta: newScenario.impact.financialDelta,
              affectedCategories: newScenario.impact.budgetAdjustments.map((a) => a.categoryName),
              riskLevel: newScenario.impact.overallRiskLevel,
            },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.explanation) {
            newScenario.impact.experienceExplanation = data.explanation;
          }
        }
      }
    } catch (e) {
      console.warn('AI scenario explanation skipped:', e);
    } finally {
      setIsSimulatingAI(false);
    }

    dispatch({ type: 'ADD_SCENARIO', payload: newScenario });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>What-If Scenarios & Impact Simulator</h2>
          <p className="text-sm text-muted">
            Model budget cuts, guest expansions, or date changes with instant deterministic impact calculations.
          </p>
        </div>
      </div>

      {/* Simulator Controls */}
      <section className={styles.section} aria-label="Scenario builder">
        <h3 className={styles.sectionTitle}>
          <span aria-hidden="true">🔮</span> Test a New Scenario
        </h3>

        {/* Quick Presets */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '8px' }}>
            QUICK PRESETS
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleCreatePresetScenario('budget_cut_15')}
            >
              📉 Cut Budget by 15%
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleCreatePresetScenario('budget_cut_25')}
            >
              ✂️ Cut Budget by 25%
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleCreatePresetScenario('guest_increase_25')}
            >
              👥 +25% Guest Count
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleCreatePresetScenario('guest_decrease_20')}
            >
              🏠 Intimate (-20% Guests)
            </button>
          </div>
        </div>

        {/* Custom Controls */}
        <div style={{ background: 'var(--color-bg-input)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '12px' }}>
            CUSTOM PARAMETER TUNER
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="text-xs font-medium">Budget Change</span>
                <span className="text-xs font-bold" style={{ color: customBudgetPercent < 0 ? 'var(--color-danger)' : customBudgetPercent > 0 ? 'var(--color-success)' : 'inherit' }}>
                  {customBudgetPercent > 0 ? `+${customBudgetPercent}%` : `${customBudgetPercent}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={customBudgetPercent}
                onChange={(e) => setCustomBudgetPercent(Number(e.target.value))}
                style={{ width: '100%' }}
                aria-label="Budget change percentage"
              />
              <span className="text-xs text-muted">
                New Target: {formatCurrency(Math.round(event.totalBudget * (1 + customBudgetPercent / 100)), event.currency)}
              </span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="text-xs font-medium">Guest Adjustment</span>
                <span className="text-xs font-bold" style={{ color: customGuestDelta > 0 ? 'var(--color-warning)' : 'inherit' }}>
                  {customGuestDelta > 0 ? `+${customGuestDelta}` : `${customGuestDelta}`} guests
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="10"
                value={customGuestDelta}
                onChange={(e) => setCustomGuestDelta(Number(e.target.value))}
                style={{ width: '100%' }}
                aria-label="Guest count adjustment"
              />
              <span className="text-xs text-muted">
                New Headcount: {Math.max(5, event.guestCount + customGuestDelta)} attendees
              </span>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCustomSimulate}
              disabled={isSimulatingAI || (customBudgetPercent === 0 && customGuestDelta === 0)}
            >
              {isSimulatingAI ? 'Simulating with AI...' : 'Run What-If Simulation ⚡'}
            </button>
          </div>
        </div>
      </section>

      {/* Scenarios List */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span aria-hidden="true">📋</span> Generated Scenarios ({scenarios.length})
        </h3>

        {scenarios.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '2rem' }} aria-hidden="true">🔮</span>
            <p className="text-sm font-semibold">No scenarios tested yet</p>
            <p className="text-xs text-muted">Use the quick presets above or customize parameters to test how budget or guest changes ripple through your event plan.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {scenarios.map((sc) => {
              const riskColor =
                sc.impact.overallRiskLevel === 'high'
                  ? 'badge-danger'
                  : sc.impact.overallRiskLevel === 'medium'
                  ? 'badge-warning'
                  : 'badge-success';

              return (
                <div
                  key={sc.id}
                  className={`${styles.scenarioCard} ${sc.applied ? styles.scenarioApplied : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{sc.name}</h4>
                        {sc.applied && (
                          <span className="badge badge-success text-xs">✓ Applied to Plan</span>
                        )}
                        <span className={`badge ${riskColor} text-xs`}>
                          {sc.impact.overallRiskLevel.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                        {sc.description}
                      </p>
                    </div>

                    {!sc.applied && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApplyScenario(sc.id)}
                      >
                        Apply to Plan
                      </button>
                    )}
                  </div>

                  {/* 3-Stage Visual State Comparison */}
                  {(() => {
                    const rawBudget = sc.changes.find((c) => c.field === 'totalBudget')?.to ?? (event.totalBudget + sc.impact.financialDelta);
                    const proposedBudget = typeof rawBudget === 'number' ? rawBudget : Number(rawBudget) || event.totalBudget;
                    const rawGuests = sc.changes.find((c) => c.field === 'guestCount')?.to ?? event.guestCount;
                    const proposedGuests = typeof rawGuests === 'number' ? rawGuests : Number(rawGuests) || event.guestCount;
                    return (
                      <div className={styles.scenarioFlow} role="group" aria-label="Scenario comparison flow">
                        <div className={styles.scenarioFlowStep}>
                          <span className={styles.scenarioFlowLabel}>Current Plan</span>
                          <span className={styles.scenarioFlowValue}>{formatCurrency(event.totalBudget, event.currency)}</span>
                          <span className="text-xs text-muted">{event.guestCount} guests</span>
                        </div>

                        <div className={styles.scenarioFlowArrow} aria-hidden="true">➔</div>

                        <div className={styles.scenarioFlowStep}>
                          <span className={styles.scenarioFlowLabel}>Proposed Scenario</span>
                          <span className={styles.scenarioFlowValue} style={{ color: 'var(--color-brand-light)' }}>
                            {formatCurrency(proposedBudget, event.currency)}
                          </span>
                          <span className="text-xs text-muted">{proposedGuests} guests</span>
                        </div>

                        <div className={styles.scenarioFlowArrow} aria-hidden="true">➔</div>

                        <div className={styles.scenarioFlowStep}>
                          <span className={styles.scenarioFlowLabel}>Calculated Impact</span>
                          <span className={`${styles.scenarioFlowValue} ${sc.impact.financialDelta < 0 ? 'text-success' : sc.impact.financialDelta > 0 ? 'text-danger' : ''}`}>
                            {sc.impact.financialDelta === 0 ? '₹0 change' : `${sc.impact.financialDelta < 0 ? '-' : '+'}${formatCurrency(Math.abs(sc.impact.financialDelta), event.currency)}`}
                          </span>
                          <span className="text-xs text-muted">
                            {sc.impact.overallRiskLevel.toUpperCase()} risk · {sc.impact.budgetAdjustments.length} categories affected
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Impact Highlights */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-2)' }}>
                    <div className={styles.impactItem}>
                      <span className="text-xs text-muted">Budget Difference:</span>
                      <span
                        className={`${styles.impactDelta} ${
                          sc.impact.financialDelta < 0
                            ? styles.impactDeltaNeg
                            : sc.impact.financialDelta > 0
                            ? styles.impactDeltaPos
                            : ''
                        }`}
                      >
                        {sc.impact.financialDelta === 0
                          ? '₹0'
                          : `${sc.impact.financialDelta < 0 ? '-' : '+'}${formatCurrency(
                              Math.abs(sc.impact.financialDelta),
                              event.currency
                            )}`}
                      </span>
                    </div>

                    <div className={styles.impactItem}>
                      <span className="text-xs text-muted">Affected Categories:</span>
                      <span className="font-semibold text-xs">
                        {sc.impact.budgetAdjustments.length} categories
                      </span>
                    </div>

                    <div className={styles.impactItem}>
                      <span className="text-xs text-muted">Action Items:</span>
                      <span className="font-semibold text-xs">
                        {sc.impact.affectedTasks.length} tasks impacted
                      </span>
                    </div>
                  </div>

                  {/* AI & Engineering Explanations */}
                  <div style={{ background: 'var(--color-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                    <div style={{ marginBottom: '6px' }}>
                      <strong className="text-xs text-muted">FINANCIAL BREAKDOWN:</strong>
                      <p style={{ marginTop: '2px' }}>{sc.impact.financialExplanation}</p>
                    </div>

                    <div style={{ marginBottom: '6px' }}>
                      <strong className="text-xs text-muted">GUEST EXPERIENCE & RISK:</strong>
                      <p style={{ marginTop: '2px' }}>{sc.impact.experienceExplanation}</p>
                    </div>

                    {sc.impact.riskExplanation && (
                      <div>
                        <strong className="text-xs text-muted">RISK ANALYSIS:</strong>
                        <p style={{ marginTop: '2px', color: 'var(--color-warning)' }}>{sc.impact.riskExplanation}</p>
                      </div>
                    )}
                  </div>

                  {/* Category Adjustments Table */}
                  {sc.impact.budgetAdjustments.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted" style={{ marginBottom: '6px' }}>
                        PROPOSED REALLOCATIONS
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {sc.impact.budgetAdjustments.map((adj) => (
                          <div
                            key={adj.categoryId}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.8rem',
                              padding: '4px 8px',
                              background: 'var(--color-bg-input)',
                              borderRadius: '4px',
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{adj.categoryName}</span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                              {formatCurrency(adj.currentAmount, event.currency)} →{' '}
                              <strong style={{ color: 'var(--color-text-primary)' }}>
                                {formatCurrency(adj.suggestedAmount, event.currency)}
                              </strong>{' '}
                              ({formatCurrency(adj.difference, event.currency)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
