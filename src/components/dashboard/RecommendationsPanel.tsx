'use client';

import { useEventContext } from '@/context/EventContext';
import { formatCurrency } from '@/lib/engines/budget-engine';
import { getDaysUntilEvent } from '@/lib/engines/timeline-engine';
import type { RecommendationType, RecommendationPriority, RecommendationImpact } from '@/lib/models/types';
import styles from './panels.module.css';

interface RecommendationsPanelProps {
  onGenerateAI: () => Promise<void>;
  isGenerating: boolean;
}

const TYPE_EMOJI: Record<RecommendationType, string> = {
  budget: '💰',
  timeline: '📅',
  vendor: '🏪',
  risk: '⚠️',
  personalization: '✨',
  idea: '💡',
};

const PRIORITY_BADGE: Record<RecommendationPriority, string> = {
  urgent: 'badge-danger',
  high: 'badge-warning',
  medium: 'badge-info',
  low: 'badge-muted',
};

const IMPACT_BADGE: Record<RecommendationImpact, string> = {
  high: 'badge-danger',
  medium: 'badge-warning',
  low: 'badge-muted',
};

export default function RecommendationsPanel({ onGenerateAI, isGenerating }: RecommendationsPanelProps) {
  const { state, dispatch } = useEventContext();
  const { currentPlan } = state;
  if (!currentPlan) return null;

  const { recommendations, event } = currentPlan;
  const daysUntil = getDaysUntilEvent(event.date);
  const active = recommendations.filter((r) => !r.dismissed);
  const urgent = active.filter((r) => r.priority === 'urgent');
  const risks = active.filter((r) => r.type === 'risk' && r.priority !== 'urgent');
  const others = active.filter((r) => r.type !== 'risk' && r.priority !== 'urgent');

  const handleDismiss = (id: string) => {
    dispatch({ type: 'DISMISS_RECOMMENDATION', payload: id });
  };

  if (recommendations.length === 0) {
    return (
      <section className={styles.panel} aria-labelledby="recs-heading">
        <div className={styles.panelHeader}>
          <h2 id="recs-heading" className={styles.panelTitle}>AI Insights</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">🧠</div>
          <div className="empty-state-title">No AI insights yet</div>
          <div className="empty-state-desc">
            Generate an AI plan to get personalized budget recommendations, risk alerts, and planning insights
          </div>
          <button
            id="generate-ai-empty-btn"
            className="btn btn-primary"
            onClick={onGenerateAI}
            disabled={isGenerating}
            aria-label="Generate AI recommendations"
          >
            {isGenerating ? (
              <><span className="spinner" aria-hidden="true" /> Generating...</>
            ) : (
              <><span aria-hidden="true">✦</span> Generate AI Plan</>
            )}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="recs-heading">
      <div className={styles.panelHeader}>
        <h2 id="recs-heading" className={styles.panelTitle}>
          AI Insights
          <span className="ai-badge ml-2">
            <span className="ai-pulse" aria-hidden="true" />
            Powered by Gemini
          </span>
        </h2>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onGenerateAI}
          disabled={isGenerating}
          aria-label="Refresh AI recommendations"
        >
          {isGenerating ? <><span className="spinner" aria-hidden="true" /> Refreshing...</> : '↻ Refresh'}
        </button>
      </div>

      {/* AI Context Visibility Ribbon */}
      <div className={styles.aiContextRibbon} role="region" aria-label="AI Planning Context">
        <span style={{ fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
          AI PLANNING CONTEXT:
        </span>
        <span className={styles.aiContextPill}>
          <span>💍</span>
          <span style={{ textTransform: 'capitalize' }}>{event.type}</span>
        </span>
        <span className={styles.aiContextPill}>
          <span>👥</span>
          <span>{event.guestCount} guests</span>
        </span>
        <span className={styles.aiContextPill}>
          <span>💰</span>
          <span>{formatCurrency(event.totalBudget, event.currency)} budget</span>
        </span>
        <span className={styles.aiContextPill}>
          <span>📅</span>
          <span>{daysUntil > 0 ? `${daysUntil} days remaining` : 'Passed'}</span>
        </span>
        <span className={styles.aiContextPill}>
          <span>📍</span>
          <span>{event.location}</span>
        </span>
      </div>

      <p className="text-sm text-muted mb-4">
        {active.length} active recommendation{active.length !== 1 ? 's' : ''} tailored to your event parameters
      </p>

      {/* Urgent */}
      {urgent.length > 0 && (
        <div>
          <h3 className={styles.sectionTitle} style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-3)' }}>
            🚨 Urgent — Needs Immediate Attention
          </h3>
          <div className={styles.recList}>
            {urgent.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onDismiss={handleDismiss}
                cardClass={styles.recCardUrgent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 'var(--space-3)' }}>
            ⚠️ Risk Alerts
          </h3>
          <div className={styles.recList}>
            {risks.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onDismiss={handleDismiss}
                cardClass={styles.recCardHigh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {others.length > 0 && (
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 'var(--space-3)' }}>
            ✨ Planning Recommendations
          </h3>
          <div className={styles.recList}>
            {others.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && (
        <div className="alert alert-success">
          <span aria-hidden="true">✓</span>
          All recommendations addressed! Generate a fresh AI analysis to get updated insights.
        </div>
      )}
    </section>
  );
}

function RecommendationCard({
  rec,
  onDismiss,
  cardClass = '',
}: {
  rec: {
    id: string;
    type: RecommendationType;
    title: string;
    explanation: string;
    impact: RecommendationImpact;
    priority: RecommendationPriority;
    suggestedAction: string;
  };
  onDismiss: (id: string) => void;
  cardClass?: string;
}) {
  return (
    <article className={`${styles.recCard} ${cardClass}`} aria-label={rec.title}>
      <div className={styles.recHeader}>
        <div className="flex items-center gap-2">
          <span aria-hidden="true">{TYPE_EMOJI[rec.type]}</span>
          <h4 className={styles.recTitle}>{rec.title}</h4>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onDismiss(rec.id)}
          aria-label={`Dismiss recommendation: ${rec.title}`}
          style={{ flexShrink: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 2 }}>
            WHY THIS MATTERS
          </div>
          <p className={styles.recExplanation} style={{ margin: 0 }}>{rec.explanation}</p>
        </div>

        {rec.suggestedAction && (
          <div style={{ background: 'var(--color-bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-brand)' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-brand-light)', marginBottom: 2 }}>
              SUGGESTED ACTION
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>
              {rec.suggestedAction}
            </div>
          </div>
        )}
      </div>

      <div className={styles.recFooter}>
        <div className={styles.recBadges}>
          <span className={`badge ${PRIORITY_BADGE[rec.priority]}`}>
            {rec.priority === 'urgent' ? '🔴 Urgent' : rec.priority}
          </span>
          <span className={`badge ${IMPACT_BADGE[rec.impact]}`}>
            {rec.impact} impact
          </span>
          <span className="badge badge-muted">{rec.type}</span>
        </div>
      </div>
    </article>
  );
}
