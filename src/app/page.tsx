'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEventContext } from '@/context/EventContext';
import styles from './page.module.css';

const EVENT_TYPES = [
  {
    id: 'wedding',
    emoji: '💍',
    label: 'Wedding',
    description: 'Full ceremony & reception planning with vendor management',
    features: ['Venue & Catering', 'Vendor Checklist', 'Guest Management', 'Budget Intelligence'],
  },
  {
    id: 'birthday',
    emoji: '🎂',
    label: 'Birthday Party',
    description: 'Milestone celebrations from intimate to grand',
    features: ['Theme Planning', 'Catering & Cake', 'Entertainment', 'Photo Moments'],
  },
  {
    id: 'community',
    emoji: '🎪',
    label: 'Community Event',
    description: 'Conferences, festivals, and large-scale gatherings',
    features: ['Permits & Logistics', 'AV & Security', 'Volunteer Mgmt', 'Sponsor Tracking'],
  },
];

const DEMO_STATS = [
  { value: '500+', label: 'Events Planned' },
  { value: '₹50Cr', label: 'Budgets Managed' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '3 min', label: 'Avg Plan Generated' },
];

// High-fidelity vector icons matching the reference image exactly
function EventTypeIcon({ type }: { type: string }) {
  if (type === 'wedding') {
    return (
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        {/* Diamond gem */}
        <polygon points="24,6 31,14 17,14" fill="#E0F2FE" />
        <polygon points="17,14 24,6 24,19" fill="#7DD3FC" />
        <polygon points="24,6 31,14 24,19" fill="#38BDF8" />
        <polygon points="17,14 24,19 13,15" fill="#BAE6FD" />
        <polygon points="31,14 24,19 35,15" fill="#0284C7" />
        {/* Ring band */}
        <circle cx="24" cy="31" r="12.5" stroke="url(#ringGrad)" strokeWidth="3.5" />
        <defs>
          <linearGradient id="ringGrad" x1="11" y1="18" x2="37" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F8FAFC" />
            <stop offset="0.45" stopColor="#818CF8" />
            <stop offset="1" stopColor="#C7D2FE" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (type === 'birthday') {
    return (
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        {/* 3 Candles with glowing flames */}
        <rect x="15" y="13" width="2.5" height="11" rx="1.2" fill="#E2E8F0" />
        <circle cx="16.25" cy="10" r="2.2" fill="#F59E0B" />
        <circle cx="16.25" cy="10" r="1.1" fill="#FEF08A" />

        <rect x="22.75" y="11" width="2.5" height="13" rx="1.2" fill="#E2E8F0" />
        <circle cx="24" cy="8" r="2.4" fill="#F59E0B" />
        <circle cx="24" cy="8" r="1.2" fill="#FEF08A" />

        <rect x="30.5" y="13" width="2.5" height="11" rx="1.2" fill="#E2E8F0" />
        <circle cx="31.75" cy="10" r="2.2" fill="#F59E0B" />
        <circle cx="31.75" cy="10" r="1.1" fill="#FEF08A" />

        {/* Cake top layer */}
        <rect x="12" y="24" width="24" height="8" rx="3" fill="#FDE68A" />
        <path d="M12 27C13.5 28.5 15 28.5 16.5 27C18 25.5 19.5 25.5 21 27C22.5 28.5 24 28.5 25.5 27C27 25.5 28.5 25.5 30 27C31.5 28.5 33 28.5 34.5 27C35.5 28 36 28 36 27V24H12V27Z" fill="#F472B6" />

        {/* Cake bottom layer */}
        <rect x="9" y="32" width="30" height="9" rx="3" fill="#FCD34D" />
        <path d="M9 35C10.5 36.5 12 36.5 13.5 35C15 33.5 16.5 33.5 18 35C19.5 36.5 21 36.5 22.5 35C24 33.5 25.5 33.5 27 35C28.5 36.5 30 36.5 31.5 35C33 33.5 34.5 33.5 36 35C37.5 36.5 38.5 36.5 39 35V32H9V35Z" fill="#EC4899" />
      </svg>
    );
  }

  // Community Event tent
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* Pennant flag */}
      <polygon points="24,5 24,10 29,7.5" fill="#F59E0B" />
      <line x1="24" y1="5" x2="24" y2="12" stroke="#F59E0B" strokeWidth="1.5" />
      {/* Tent roof */}
      <polygon points="24,12 8,26 40,26" fill="#F43F5E" />
      <polygon points="24,12 16,26 32,26" fill="#FFE4E6" />
      <polygon points="24,12 21,26 27,26" fill="#E11D48" />
      {/* Scallop valance */}
      <path d="M8 26C10 28 12 28 14 26C16 28 18 28 20 26C22 28 24 28 26 26C28 28 30 28 32 26C34 28 36 28 38 26C39 27 40 27 40 26V29C40 29 39 30 38 29C36 31 34 31 32 29C30 31 28 31 26 29C24 31 22 31 20 29C18 31 16 31 14 29C12 31 10 31 8 29V26Z" fill="#BE123C" />
      {/* Walls */}
      <rect x="11" y="29" width="26" height="11" fill="#FFF1F2" />
      {/* Opening */}
      <path d="M20 40C20 33 24 32 24 32C24 32 28 33 28 40H20Z" fill="#881337" />
    </svg>
  );
}

function FeatureIconComponent({ title }: { title: string }) {
  if (title === 'AI Planning Engine') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9.5 2A4.5 4.5 0 005 6.5C5 7.1 5.1 7.7 5.3 8.2A4.5 4.5 0 004 12c0 1.9 1.1 3.5 2.7 4.2-.4.6-.7 1.4-.7 2.3 0 2.2 1.8 4 4 4 .8 0 1.6-.2 2.3-.7.7 1.3 2 2.2 3.7 2.2 2.2 0 4-1.8 4-4 0-.8-.2-1.5-.6-2.1 1.7-.6 2.9-2.2 2.9-4.1 0-1.5-.7-2.8-1.8-3.6.3-.6.5-1.3.5-2.1A4.5 4.5 0 0014.5 2C13.8 2 13.1.2 12.5.5 11.9.2 11.2 2 10.5 2z" stroke="#F43F5E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="rgba(244, 63, 94, 0.15)" />
        <path d="M12 4v16M8 8c1.5 1 2 2.5 2 4s-.5 3-2 4M16 8c-1.5 1-2 2.5-2 4s.5 3 2 4" stroke="#FB7185" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (title === 'Smart Budget Engine') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="1.8" fill="rgba(245, 158, 11, 0.15)" />
        <path d="M12 5v2M12 17v2M9 8.5h4.5c1.2 0 2.5.8 2.5 2s-1.3 2-2.5 2H10c-1.2 0-2.5.8-2.5 2s1.3 2 2.5 2h5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (title === 'Dynamic Timeline') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="3" stroke="#38BDF8" strokeWidth="1.8" fill="rgba(56, 189, 248, 0.12)" />
        <line x1="16" y1="2" x2="16" y2="6" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="6" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="10" x2="21" y2="10" stroke="#38BDF8" strokeWidth="1.5" />
        <circle cx="8" cy="14" r="1.2" fill="#38BDF8" />
        <circle cx="12" cy="14" r="1.2" fill="#38BDF8" />
        <circle cx="16" cy="14" r="1.2" fill="#38BDF8" />
        <circle cx="8" cy="17.5" r="1.2" fill="#38BDF8" />
        <circle cx="12" cy="17.5" r="1.2" fill="#38BDF8" />
      </svg>
    );
  }
  if (title === 'What-if Scenarios') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="10" r="7.5" stroke="#A78BFA" strokeWidth="1.8" fill="rgba(167, 139, 250, 0.18)" />
        <path d="M7 19h10l-2-2.5H9L7 19z" fill="#7C3AED" stroke="#A78BFA" strokeWidth="1.5" />
        <path d="M10 8a2.5 2.5 0 012.5-2.5" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (title === 'Vendor Tracker') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 7h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="#818CF8" strokeWidth="1.8" fill="rgba(129, 140, 248, 0.12)" />
        <path d="M3 7l2.5-4h13L21 7" stroke="#818CF8" strokeWidth="1.8" />
        <line x1="8" y1="11" x2="8" y2="16" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="11" x2="12" y2="16" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="11" x2="16" y2="16" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  // Secure by Design
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2.5" stroke="#FBBF24" strokeWidth="1.8" fill="rgba(251, 191, 36, 0.15)" />
      <path d="M8 10V6.5a4 4 0 018 0V10" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.5" fill="#FBBF24" />
      <line x1="12" y1="16.5" x2="12" y2="18" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { loadDemoPlan } = useEventContext();
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  // Default selected event type is birthday matching the reference image
  const [selectedType, setSelectedType] = useState<string>('birthday');

  const handleLoadDemo = (type: 'wedding' | 'birthday' | 'community') => {
    setLoadingDemo(type);
    loadDemoPlan(type);
    setTimeout(() => {
      router.push('/dashboard');
    }, 300);
  };

  const handleCreateNew = () => {
    router.push('/create');
  };

  return (
    <main className={styles.home}>
      {/* Top Left Assistant Name */}
      <div className={styles.topBrand} aria-label="Eventique — AI Event Planning Assistant">
        <span className={styles.topBrandLogo} aria-hidden="true">✦</span>
        <span className={styles.topBrandTitle}>Eventique</span>
        <span className={styles.topBrandSep} aria-hidden="true">—</span>
        <span className={styles.topBrandSubtitle}>AI Event Planning Assistant</span>
      </div>

      {/* Background with Ambient Glows & Grid */}
      <div className={styles.heroBg} aria-hidden="true">
        <div className={styles.heroBgArc} />
        <div className={styles.heroBgGlow1} />
        <div className={styles.heroBgGlow2} />
        <div className={styles.heroBgGlow3} />
        <div className={styles.heroBgGrid} />
      </div>

      {/* Hero */}
      <section className={styles.hero} aria-label="Hero section">
        <div className={styles.heroContent}>
          <div className={styles.heroTag} aria-label="Product badge">
            <span className={styles.heroTagIcon} aria-hidden="true">✦</span>
            Powered by Google Gemini AI
          </div>

          <h1 className={styles.heroTitle}>
            Plan Events with<br />
            <span className={styles.heroGradient}>Intelligent Precision</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Transform your vision into an actionable, AI-powered event plan.
            Dynamic budgets, smart timelines, vendor management, and what-if scenarios
            — all working together.
          </p>

          <div className={styles.heroCta}>
            <button
              id="create-new-event-btn"
              className="btn btn-primary btn-lg"
              onClick={handleCreateNew}
              aria-label="Create a new event plan"
            >
              <span aria-hidden="true">✦</span>
              Create New Event
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => handleLoadDemo('wedding')}
              aria-label="Load wedding demo"
            >
              <span aria-hidden="true">▶</span>
              See Demo Plan
            </button>
          </div>

          {/* Stats */}
          <div className={styles.heroStats} role="list" aria-label="Platform statistics">
            {DEMO_STATS.map((stat) => (
              <div key={stat.label} className={styles.heroStat} role="listitem">
                <span className={styles.heroStatValue}>{stat.value}</span>
                <span className={styles.heroStatLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Event Type Selection */}
      <section className={styles.section} aria-labelledby="event-types-heading">
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 id="event-types-heading" className={styles.sectionTitle}>Choose Your Event Type</h2>
            <p className={styles.sectionDesc}>
              Each event type has a tailored planning framework, budgets, and vendor recommendations
            </p>
          </div>

          <div className={styles.eventGrid} role="list" aria-label="Event type options">
            {EVENT_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <article
                  key={type.id}
                  className={`${styles.eventCard} ${isSelected ? styles.eventCardSelected : ''}`}
                  role="listitem"
                  onClick={() => setSelectedType(type.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedType(type.id);
                    }
                  }}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <div className={styles.eventIconWrap} aria-hidden="true">
                    <EventTypeIcon type={type.id} />
                  </div>
                  <h3 className={styles.eventLabel}>{type.label}</h3>
                  <p className={styles.eventDesc}>{type.description}</p>

                  <ul className={styles.featureList} aria-label={`${type.label} features`}>
                    {type.features.map((f) => (
                      <li key={f} className={styles.featureItem}>
                        <span className={styles.featureCheck} aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className={styles.eventActions} onClick={(e) => e.stopPropagation()}>
                    <button
                      id={`demo-${type.id}-btn`}
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleLoadDemo(type.id as 'wedding' | 'birthday' | 'community')}
                      disabled={loadingDemo === type.id}
                      aria-label={`Load ${type.label} demo`}
                    >
                      {loadingDemo === type.id ? (
                        <><span className="spinner" aria-hidden="true" /> Loading...</>
                      ) : (
                        <>View Demo</>
                      )}
                    </button>
                    <button
                      id={`create-${type.id}-btn`}
                      className="btn btn-primary btn-sm"
                      onClick={handleCreateNew}
                      aria-label={`Create new ${type.label}`}
                    >
                      Start Planning
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className={styles.features} aria-labelledby="features-heading">
        <div className="container">
          <h2 id="features-heading" className="sr-only">Key Features</h2>
          <div className={styles.featureGrid}>
            {[
              { icon: '🧠', title: 'AI Planning Engine', desc: 'Gemini-powered recommendations tailored to YOUR event context, not generic advice.' },
              { icon: '💰', title: 'Smart Budget Engine', desc: 'Deterministic budget math with AI insights. Visual allocation, spent tracking, and overflow warnings.' },
              { icon: '📅', title: 'Dynamic Timeline', desc: 'Auto-generated task deadlines with overdue detection. Recalculates when your event date changes.' },
              { icon: '🔮', title: 'What-if Scenarios', desc: 'Simulate budget reductions, guest increases, or date changes. See exact impact before committing.' },
              { icon: '🏪', title: 'Vendor Tracker', desc: 'Category-specific vendor checklists with status tracking from research to confirmation.' },
              { icon: '🔒', title: 'Secure by Design', desc: 'API keys stay server-side. All AI outputs validated. Prompt injection protection built in.' },
            ].map((f) => (
              <div key={f.title} className={styles.featureItem2}>
                <div className={styles.featureIconWrap} aria-hidden="true">
                  <FeatureIconComponent title={f.title} />
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer} role="contentinfo">
        <div className="container">
          <p className={styles.footerText}>
            Eventique — AI Event Planning Assistant
            <span aria-hidden="true"> · </span>
            Built with Next.js &amp; Google Gemini
          </p>
        </div>
      </footer>
    </main>
  );
}
