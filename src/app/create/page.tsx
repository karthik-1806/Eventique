'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useEventContext } from '@/context/EventContext';
import type { EventType, Currency, EventProfile } from '@/lib/models/types';
import { formatCurrency } from '@/lib/engines/budget-engine';
import { v4 as uuidv4 } from 'uuid';
import styles from './page.module.css';

// ---- Types ----
interface FormData {
  type: EventType;
  name: string;
  date: string;
  location: string;
  guestCount: number;
  totalBudget: number;
  currency: Currency;
  style: string;
  priorities: string[];
  requirements: string;
}

const STEPS = ['Event Type', 'Basic Info', 'Budget & Guests', 'Preferences'];

const PRIORITY_OPTIONS: Record<EventType, string[]> = {
  wedding: ['Guest Experience', 'Photography & Video', 'Food Quality', 'Venue Ambiance', 'Music & Entertainment', 'Decoration', 'Staying On Budget'],
  birthday: ['Fun Atmosphere', 'Good Food', 'Music & Entertainment', 'Photography Moments', 'Surprise Elements', 'Staying On Budget'],
  community: ['Speaker Quality', 'Networking', 'AV Production', 'Attendee Experience', 'Accessibility', 'Sponsor Visibility', 'Staying On Budget'],
};

const DEFAULT_BUDGETS: Record<EventType, number> = {
  wedding: 800000,
  birthday: 150000,
  community: 500000,
};

const DEFAULT_GUEST_COUNTS: Record<EventType, number> = {
  wedding: 150,
  birthday: 50,
  community: 300,
};

const DEFAULT_STYLES: Record<EventType, string> = {
  wedding: 'Modern Elegant',
  birthday: 'Fun & Festive',
  community: 'Professional & Welcoming',
};

function getMinDate(type: EventType): string {
  const today = new Date();
  const minDays: Record<EventType, number> = { wedding: 90, birthday: 14, community: 60 };
  today.setDate(today.getDate() + minDays[type]);
  return today.toISOString().split('T')[0];
}

export default function CreateEventPage() {
  const router = useRouter();
  const { createNewPlan } = useEventContext();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>({
    type: 'wedding',
    name: '',
    date: '',
    location: '',
    guestCount: 150,
    totalBudget: 800000,
    currency: 'INR',
    style: 'Modern Elegant',
    priorities: ['Guest Experience', 'Photography & Video'],
    requirements: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const selectEventType = (type: EventType) => {
    setForm({
      type,
      name: '',
      date: '',
      location: '',
      guestCount: DEFAULT_GUEST_COUNTS[type],
      totalBudget: DEFAULT_BUDGETS[type],
      currency: 'INR',
      style: DEFAULT_STYLES[type],
      priorities: PRIORITY_OPTIONS[type].slice(0, 2),
      requirements: '',
    });
    setStep(1);
  };

  const togglePriority = (priority: string) => {
    setForm((prev) => {
      const current = prev.priorities;
      if (current.includes(priority)) {
        return { ...prev, priorities: current.filter((p) => p !== priority) };
      }
      if (current.length >= 4) return prev; // max 4
      return { ...prev, priorities: [...current, priority] };
    });
  };

  const validateStep = (): boolean => {
    const newErrors: typeof errors = {};

    if (step === 1) {
      if (!form.name.trim()) newErrors.name = 'Event name is required';
      else if (form.name.length > 200) newErrors.name = 'Name too long';
      if (!form.date) newErrors.date = 'Date is required';
      if (!form.location.trim()) newErrors.location = 'Location is required';
    }

    if (step === 2) {
      if (form.guestCount < 1) newErrors.guestCount = 'Must have at least 1 guest';
      if (form.guestCount > 10000) newErrors.guestCount = 'Maximum 10,000 guests';
      if (form.totalBudget < 1000) newErrors.totalBudget = 'Budget seems too low';
      if (form.totalBudget > 1000000000) newErrors.totalBudget = 'Budget out of range';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);

    const event: EventProfile = {
      id: uuidv4(),
      type: form.type,
      name: form.name.trim(),
      date: form.date,
      location: form.location.trim(),
      guestCount: form.guestCount,
      totalBudget: form.totalBudget,
      currency: form.currency,
      style: form.style.trim() || DEFAULT_STYLES[form.type],
      priorities: form.priorities,
      requirements: form.requirements.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createNewPlan(event);
    router.push('/dashboard');
  };

  // ---- STEP 0: Event type ----
  if (step === 0) {
    return (
      <main className={styles.createPage}>
        <div className={styles.createHeader}>
          <button className="btn btn-ghost" onClick={() => router.push('/')} aria-label="Go back to home">
            ← Back
          </button>
          <div className={styles.stepIndicator} role="progressbar" aria-valuenow={0} aria-valuemax={3} aria-label="Step 1 of 4">
            {STEPS.map((s, i) => (
              <div key={s} className={`${styles.stepDot} ${i <= step ? styles.stepDotActive : ''}`} aria-hidden="true" />
            ))}
          </div>
        </div>

        <div className={styles.createContent}>
          <h1 className={styles.createTitle}>What are you planning?</h1>
          <p className={styles.createSubtitle}>Choose your event type to get a tailored planning framework</p>

          <div className={styles.typeGrid} role="group" aria-label="Event type selection">
            {[
              { id: 'wedding' as EventType, emoji: '💍', label: 'Wedding', desc: 'Full ceremony & reception with vendor management' },
              { id: 'birthday' as EventType, emoji: '🎂', label: 'Birthday', desc: 'Milestone celebrations from intimate to grand' },
              { id: 'community' as EventType, emoji: '🎪', label: 'Community Event', desc: 'Conferences, festivals & large gatherings' },
            ].map((t) => (
              <button
                key={t.id}
                id={`type-select-${t.id}`}
                className={`${styles.typeCard} ${form.type === t.id ? styles.typeCardSelected : ''}`}
                onClick={() => selectEventType(t.id)}
                aria-pressed={form.type === t.id}
              >
                <span className={styles.typeEmoji} aria-hidden="true">{t.emoji}</span>
                <span className={styles.typeLabel}>{t.label}</span>
                <span className={styles.typeDesc}>{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ---- STEP 1: Basic Info ----
  if (step === 1) {
    return (
      <main className={styles.createPage}>
        <div className={styles.createHeader}>
          <button className="btn btn-ghost" onClick={handleBack} aria-label="Go back">
            ← Back
          </button>
          <div className={styles.stepIndicator} role="progressbar" aria-valuenow={1} aria-valuemax={3}>
            {STEPS.map((s, i) => (
              <div key={s} className={`${styles.stepDot} ${i <= step ? styles.stepDotActive : ''}`} aria-hidden="true" />
            ))}
          </div>
        </div>

        <div className={styles.createContent}>
          <h1 className={styles.createTitle}>Tell us about your event</h1>
          <p className={styles.createSubtitle}>Basic details to set up your planning workspace</p>

          <form className={styles.formCard} onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
            <div className="form-group">
              <label htmlFor="event-name">Event Name <span aria-hidden="true">*</span></label>
              <input
                id="event-name"
                type="text"
                placeholder={form.type === 'wedding' ? "Aanya & Rohan's Wedding" : form.type === 'birthday' ? "Kavya's 30th Birthday" : "Bengaluru Tech Fest 2026"}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                maxLength={200}
                aria-describedby={errors.name ? 'name-error' : undefined}
                aria-invalid={!!errors.name}
              />
              {errors.name && <span id="name-error" className={styles.error} role="alert">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="event-date">Event Date <span aria-hidden="true">*</span></label>
              <input
                id="event-date"
                type="date"
                value={form.date}
                min={getMinDate(form.type)}
                onChange={(e) => updateField('date', e.target.value)}
                aria-describedby={errors.date ? 'date-error' : undefined}
                aria-invalid={!!errors.date}
              />
              {errors.date && <span id="date-error" className={styles.error} role="alert">{errors.date}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="event-location">Location / Venue <span aria-hidden="true">*</span></label>
              <input
                id="event-location"
                type="text"
                placeholder="City, Venue Name"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                maxLength={300}
                aria-describedby={errors.location ? 'location-error' : undefined}
                aria-invalid={!!errors.location}
              />
              {errors.location && <span id="location-error" className={styles.error} role="alert">{errors.location}</span>}
            </div>

            <div className={styles.formRow}>
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button type="submit" className="btn btn-primary" id="step1-next-btn">
                Continue →
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // ---- STEP 2: Budget & Guests ----
  if (step === 2) {
    return (
      <main className={styles.createPage}>
        <div className={styles.createHeader}>
          <button className="btn btn-ghost" onClick={handleBack} aria-label="Go back">
            ← Back
          </button>
          <div className={styles.stepIndicator} role="progressbar" aria-valuenow={2} aria-valuemax={3}>
            {STEPS.map((s, i) => (
              <div key={s} className={`${styles.stepDot} ${i <= step ? styles.stepDotActive : ''}`} aria-hidden="true" />
            ))}
          </div>
        </div>

        <div className={styles.createContent}>
          <h1 className={styles.createTitle}>Budget & Guest Count</h1>
          <p className={styles.createSubtitle}>These will drive your entire budget allocation and planning timeline</p>

          <form className={styles.formCard} onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
            <div className={styles.budgetRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(e) => updateField('currency', e.target.value as Currency)}
                >
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 3 }}>
                <label htmlFor="budget">Total Budget <span aria-hidden="true">*</span></label>
                <input
                  id="budget"
                  type="number"
                  value={form.totalBudget}
                  min={1000}
                  max={1000000000}
                  step={1000}
                  onChange={(e) => updateField('totalBudget', Number(e.target.value))}
                  aria-describedby={errors.totalBudget ? 'budget-error' : 'budget-hint'}
                  aria-invalid={!!errors.totalBudget}
                />
                <span id="budget-hint" className="text-xs text-muted">
                  Suggested for this event type: {formatCurrency(DEFAULT_BUDGETS[form.type], form.currency)}
                </span>
                {errors.totalBudget && <span id="budget-error" className={styles.error} role="alert">{errors.totalBudget}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="guest-count">Guest Count <span aria-hidden="true">*</span></label>
              <input
                id="guest-count"
                type="number"
                value={form.guestCount}
                min={1}
                max={10000}
                onChange={(e) => updateField('guestCount', Number(e.target.value))}
                aria-describedby={errors.guestCount ? 'guests-error' : 'guests-hint'}
                aria-invalid={!!errors.guestCount}
              />
              <span id="guests-hint" className="text-xs text-muted">
                Per-guest budget: ~{formatCurrency(form.guestCount > 0 ? Math.round(form.totalBudget / form.guestCount) : 0, form.currency)}
              </span>
              {errors.guestCount && <span id="guests-error" className={styles.error} role="alert">{errors.guestCount}</span>}
            </div>

            <div className={styles.formRow}>
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button type="submit" className="btn btn-primary" id="step2-next-btn">
                Continue →
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // ---- STEP 3: Preferences ----
  return (
    <main className={styles.createPage}>
      <div className={styles.createHeader}>
        <button className="btn btn-ghost" onClick={handleBack} aria-label="Go back">
          ← Back
        </button>
        <div className={styles.stepIndicator} role="progressbar" aria-valuenow={3} aria-valuemax={3}>
          {STEPS.map((s, i) => (
            <div key={s} className={`${styles.stepDot} ${i <= step ? styles.stepDotActive : ''}`} aria-hidden="true" />
          ))}
        </div>
      </div>

      <div className={styles.createContent}>
        <h1 className={styles.createTitle}>Preferences & Style</h1>
        <p className={styles.createSubtitle}>This helps the AI give you truly personalized recommendations</p>

        <form className={styles.formCard} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div className="form-group">
            <label htmlFor="style">Event Style / Theme</label>
            <input
              id="style"
              type="text"
              placeholder={DEFAULT_STYLES[form.type]}
              value={form.style}
              onChange={(e) => updateField('style', e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label>Your Priorities <span className="text-muted">(select up to 4)</span></label>
            <div className={styles.priorityGrid} role="group" aria-label="Event priorities">
              {PRIORITY_OPTIONS[form.type].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${styles.priorityChip} ${form.priorities.includes(p) ? styles.priorityChipSelected : ''}`}
                  onClick={() => togglePriority(p)}
                  aria-pressed={form.priorities.includes(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="requirements">Special Requirements <span className="text-muted">(optional)</span></label>
            <textarea
              id="requirements"
              placeholder="e.g. Vegetarian menu, wheelchair accessibility, live streaming..."
              value={form.requirements}
              onChange={(e) => updateField('requirements', e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <button type="button" className="btn btn-secondary" onClick={handleBack}>
              Back
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              id="create-plan-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><span className="spinner" aria-hidden="true" /> Creating Plan...</>
              ) : (
                <><span aria-hidden="true">✦</span> Create My Plan</>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
