// ============================================================
// DEMO DATA — Realistic event demos for immediate exploration
// ============================================================

import type { EventPlan, EventProfile, Budget, Task, Vendor, PlanningRecommendation } from '@/lib/models/types';

const WEDDING_EVENT: EventProfile = {
  id: 'demo-wedding-001',
  type: 'wedding',
  name: 'Aanya & Rohan\'s Wedding',
  date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
  location: 'The Grand Leela Palace, Mumbai',
  guestCount: 180,
  totalBudget: 800000,
  currency: 'INR',
  style: 'Modern Traditional — fusion of contemporary elegance with Indian heritage',
  priorities: ['Guest Experience', 'Photography', 'Venue Ambiance', 'Food Quality'],
  requirements: 'Vegetarian menu, traditional mehendi ceremony, live classical music, bridal suite',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const BIRTHDAY_EVENT: EventProfile = {
  id: 'demo-birthday-001',
  type: 'birthday',
  name: 'Kavya\'s 30th Birthday Bash',
  date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days from now
  location: 'Skyline Terrace, Hyderabad',
  guestCount: 60,
  totalBudget: 150000,
  currency: 'INR',
  style: 'Rooftop Garden Party — boho chic with fairy lights',
  priorities: ['Fun Atmosphere', 'Good Food', 'Music', 'Photography Moments'],
  requirements: 'Surprise element, live acoustic set, photo booth, customized birthday cake',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const COMMUNITY_EVENT: EventProfile = {
  id: 'demo-community-001',
  type: 'community',
  name: 'Bengaluru Tech Fest 2026',
  date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months from now
  location: 'KTPO Convention Center, Bangalore',
  guestCount: 500,
  totalBudget: 500000,
  currency: 'INR',
  style: 'Professional Conference — modern, clean, tech-forward aesthetic',
  priorities: ['Speaker Quality', 'Networking', 'AV Production', 'Attendee Experience'],
  requirements: 'Multiple breakout sessions, live streaming, sponsor booths, networking dinner',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Wedding budget categories
function buildWeddingBudget(): Budget {
  return {
    eventId: 'demo-wedding-001',
    contingencyPercent: 5,
    categories: [
      { id: 'wb-1', name: 'Venue', allocated: 240000, spent: 240000, isLocked: true, notes: 'The Grand Leela - booked & paid deposit', aiSuggested: false },
      { id: 'wb-2', name: 'Catering', allocated: 200000, spent: 0, isLocked: false, notes: 'Approx ₹1,100/person for 180 guests', aiSuggested: false },
      { id: 'wb-3', name: 'Photography & Video', allocated: 80000, spent: 15000, isLocked: false, notes: 'Advance paid to Kapoor Photography', aiSuggested: false },
      { id: 'wb-4', name: 'Decoration & Flowers', allocated: 80000, spent: 0, isLocked: false, notes: 'Marigold & rose theme', aiSuggested: false },
      { id: 'wb-5', name: 'Entertainment & Music', allocated: 56000, spent: 0, isLocked: false, notes: 'Classical Hindustani ensemble', aiSuggested: false },
      { id: 'wb-6', name: 'Wedding Attire', allocated: 40000, spent: 22000, isLocked: false, notes: 'Lehenga ordered, accessories pending', aiSuggested: false },
      { id: 'wb-7', name: 'Invitations & Stationery', allocated: 16000, spent: 8000, isLocked: false, notes: 'Digital + physical invites done', aiSuggested: false },
      { id: 'wb-8', name: 'Transportation', allocated: 24000, spent: 0, isLocked: false, notes: '3 decorated cars for family', aiSuggested: false },
      { id: 'wb-9', name: 'Accommodation', allocated: 24000, spent: 0, isLocked: false, notes: 'Block booking at nearby hotel', aiSuggested: false },
      { id: 'wb-10', name: 'Miscellaneous', allocated: 24000, spent: 5500, isLocked: false, notes: 'Favors, emergency fund, tips', aiSuggested: false },
      { id: 'wb-11', name: 'Contingency', allocated: 16000, spent: 0, isLocked: true, notes: '2% contingency reserve', aiSuggested: false },
    ],
  };
}

// Birthday budget categories
function buildBirthdayBudget(): Budget {
  return {
    eventId: 'demo-birthday-001',
    contingencyPercent: 5,
    categories: [
      { id: 'bb-1', name: 'Venue', allocated: 37500, spent: 15000, isLocked: false, notes: 'Skyline Terrace deposit paid', aiSuggested: false },
      { id: 'bb-2', name: 'Catering & Cake', allocated: 45000, spent: 0, isLocked: false, notes: '₹750/person + customized 5-tier cake', aiSuggested: false },
      { id: 'bb-3', name: 'Decoration', allocated: 22500, spent: 0, isLocked: false, notes: 'Fairy lights, boho setup', aiSuggested: false },
      { id: 'bb-4', name: 'Entertainment', allocated: 22500, spent: 5000, isLocked: false, notes: 'Acoustic duo advance paid', aiSuggested: false },
      { id: 'bb-5', name: 'Photography', allocated: 12000, spent: 0, isLocked: false, notes: 'Includes photo booth rental', aiSuggested: false },
      { id: 'bb-6', name: 'Invitations', allocated: 3000, spent: 3000, isLocked: false, notes: 'Digital invites sent', aiSuggested: false },
      { id: 'bb-7', name: 'Miscellaneous', allocated: 7500, spent: 0, isLocked: false, notes: 'Return gifts, party favors', aiSuggested: false },
    ],
  };
}

// Community event budget
function buildCommunityBudget(): Budget {
  return {
    eventId: 'demo-community-001',
    contingencyPercent: 5,
    categories: [
      { id: 'cb-1', name: 'Venue', allocated: 100000, spent: 50000, isLocked: true, notes: 'KTPO deposit paid', aiSuggested: false },
      { id: 'cb-2', name: 'Catering', allocated: 150000, spent: 0, isLocked: false, notes: '₹300/head for 500 attendees', aiSuggested: false },
      { id: 'cb-3', name: 'Audio/Visual Equipment', allocated: 60000, spent: 20000, isLocked: false, notes: 'AV company advance', aiSuggested: false },
      { id: 'cb-4', name: 'Decoration & Signage', allocated: 40000, spent: 0, isLocked: false, notes: 'Sponsor banners + stage design', aiSuggested: false },
      { id: 'cb-5', name: 'Security', allocated: 25000, spent: 0, isLocked: false, notes: '8 security personnel for 2 days', aiSuggested: false },
      { id: 'cb-6', name: 'Transportation', allocated: 25000, spent: 0, isLocked: false, notes: 'Speaker transport + shuttle', aiSuggested: false },
      { id: 'cb-7', name: 'Marketing & Invitations', allocated: 35000, spent: 28000, isLocked: false, notes: 'Social media + print done', aiSuggested: false },
      { id: 'cb-8', name: 'Permits & Insurance', allocated: 25000, spent: 25000, isLocked: true, notes: 'All permits obtained', aiSuggested: false },
      { id: 'cb-9', name: 'Volunteers & Staff', allocated: 25000, spent: 0, isLocked: false, notes: '20 volunteers + 5 paid staff', aiSuggested: false },
      { id: 'cb-10', name: 'Miscellaneous', allocated: 15000, spent: 2000, isLocked: false, notes: 'Badges, printing, gifts', aiSuggested: false },
    ],
  };
}

// Demo vendors - Wedding
const WEDDING_VENDORS: Vendor[] = [
  { id: 'wv-1', eventId: 'demo-wedding-001', category: 'Venue', name: 'The Grand Leela Palace', estimatedCost: 240000, status: 'confirmed', contactInfo: '+91 22 6600 1234', deadline: '2026-01-15', notes: 'Banquet hall + bridal suite booked. Deposit paid.' },
  { id: 'wv-2', eventId: 'demo-wedding-001', category: 'Photography', name: 'Kapoor Photography Studio', estimatedCost: 65000, status: 'booked', contactInfo: '+91 98765 43210', deadline: '2026-02-01', notes: '2 photographers + 1 videographer. Advance paid.' },
  { id: 'wv-3', eventId: 'demo-wedding-001', category: 'Catering', name: 'Sharma Grand Caterers', estimatedCost: 198000, status: 'contacted', contactInfo: '+91 99887 65432', deadline: '2026-03-01', notes: 'Vegetarian menu tasting scheduled' },
  { id: 'wv-4', eventId: 'demo-wedding-001', category: 'Decoration', name: 'Bloom & Petal Events', estimatedCost: 75000, status: 'researching', contactInfo: '', deadline: '2026-02-15', notes: 'Shortlisted, awaiting quote' },
  { id: 'wv-5', eventId: 'demo-wedding-001', category: 'Entertainment', name: 'Raag Ensemble', estimatedCost: 45000, status: 'researching', contactInfo: '', deadline: '2026-02-20', notes: 'Classical Hindustani trio' },
  { id: 'wv-6', eventId: 'demo-wedding-001', category: 'Transportation', name: 'Royal Rides Mumbai', estimatedCost: 22000, status: 'researching', contactInfo: '', deadline: '2026-03-15', notes: '3 decorated cars needed' },
];

// Demo recommendations - Wedding
const WEDDING_RECOMMENDATIONS: PlanningRecommendation[] = [
  {
    id: 'wr-1',
    type: 'risk',
    title: 'Book caterer within 2 weeks',
    explanation: 'With 180 guests and only 6 months to go, premium vegetarian caterers in Mumbai fill up fast. Your current catering slot is unconfirmed and this is your highest unbooked cost at ₹2L.',
    impact: 'high',
    priority: 'urgent',
    suggestedAction: 'Contact Sharma Grand Caterers for menu tasting this week',
    dismissed: false,
  },
  {
    id: 'wr-2',
    type: 'vendor',
    title: 'Secure decoration vendor — 3 shortlisted',
    explanation: 'Your ₹80,000 decoration budget is realistic for a 180-person wedding with marigold & rose theme in Mumbai. However, your current vendor is only "researching" status.',
    impact: 'high',
    priority: 'high',
    suggestedAction: 'Request quotes from at least 3 decorators this week',
    dismissed: false,
  },
  {
    id: 'wr-3',
    type: 'personalization',
    title: 'Two-photographer setup recommended',
    explanation: 'For an event with 180 guests and simultaneous ceremonies (mehendi, wedding hall), a single photographer will miss key moments. Your ₹80,000 photography allocation comfortably covers a 2-photographer team.',
    impact: 'high',
    priority: 'high',
    suggestedAction: 'Confirm second photographer with Kapoor Photography',
    dismissed: false,
  },
  {
    id: 'wr-4',
    type: 'budget',
    title: 'Contingency reserve is below recommended',
    explanation: 'Your contingency is ₹16,000 (2% of budget). For a 180-guest wedding in Mumbai, industry standard is 5-10%. Unexpected vendor charges, last-minute additions, and tips typically add up to ₹40,000-60,000.',
    impact: 'medium',
    priority: 'medium',
    suggestedAction: 'Increase contingency to at least ₹40,000 by reducing Miscellaneous category',
    dismissed: false,
  },
  {
    id: 'wr-5',
    type: 'timeline',
    title: 'Send save-the-dates within 30 days',
    explanation: 'With guests expected from outside Mumbai, save-the-dates should go out 5-6 months before. Your event is in 6 months — this window is closing.',
    impact: 'medium',
    priority: 'high',
    suggestedAction: 'Finalize guest list and send save-the-dates digitally within 2 weeks',
    dismissed: false,
  },
];

// Demo tasks - pre-built subset
function buildWeddingTasks(): Task[] {
  const today = new Date();
  const eventDate = new Date(WEDDING_EVENT.date);
  
  const makeTask = (
    id: string,
    title: string,
    category: string,
    daysBeforeEvent: number,
    priority: Task['priority'],
    status: Task['status'],
  ): Task => {
    const deadline = new Date(eventDate);
    deadline.setDate(deadline.getDate() - daysBeforeEvent);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id,
      eventId: 'demo-wedding-001',
      title,
      category,
      deadline: deadline.toISOString().split('T')[0],
      priority,
      status,
      dependsOn: [],
      notes: '',
      isOverdue: daysUntilDeadline < 0,
      daysUntilDeadline,
    };
  };

  return [
    makeTask('wt-1', 'Set wedding date and create event profile', 'Planning', 365, 'critical', 'completed'),
    makeTask('wt-2', 'Establish total budget', 'Budget', 360, 'critical', 'completed'),
    makeTask('wt-3', 'Book venue', 'Venue', 300, 'critical', 'completed'),
    makeTask('wt-4', 'Hire wedding planner / coordinator', 'Planning', 300, 'high', 'completed'),
    makeTask('wt-5', 'Finalize guest list', 'Guests', 270, 'critical', 'in_progress'),
    makeTask('wt-6', 'Book caterer', 'Catering', 240, 'critical', 'not_started'),
    makeTask('wt-7', 'Book photographer & videographer', 'Photography', 240, 'critical', 'completed'),
    makeTask('wt-8', 'Book entertainment / band / DJ', 'Entertainment', 210, 'high', 'not_started'),
    makeTask('wt-9', 'Choose and order wedding attire', 'Attire', 200, 'high', 'in_progress'),
    makeTask('wt-10', 'Book makeup & hair', 'Beauty', 180, 'high', 'not_started'),
    makeTask('wt-11', 'Book florist & decorator', 'Decoration', 180, 'high', 'not_started'),
    makeTask('wt-12', 'Send save-the-dates', 'Invitations', 180, 'medium', 'not_started'),
    makeTask('wt-13', 'Arrange accommodation for out-of-town guests', 'Accommodation', 150, 'medium', 'not_started'),
    makeTask('wt-14', 'Book transportation', 'Transportation', 120, 'medium', 'not_started'),
    makeTask('wt-15', 'Finalize menu with caterer', 'Catering', 90, 'high', 'not_started'),
    makeTask('wt-16', 'Send formal wedding invitations', 'Invitations', 90, 'critical', 'not_started'),
    makeTask('wt-17', 'Purchase wedding rings', 'Rings', 75, 'critical', 'not_started'),
    makeTask('wt-18', 'Confirm all vendor bookings', 'Vendors', 60, 'critical', 'not_started'),
    makeTask('wt-19', 'Create day-of timeline', 'Planning', 30, 'critical', 'not_started'),
    makeTask('wt-20', 'Final guest count to caterer', 'Catering', 14, 'critical', 'not_started'),
  ];
}

function buildBirthdayTasks(): Task[] {
  const today = new Date();
  const eventDate = new Date(BIRTHDAY_EVENT.date);
  
  const makeTask = (
    id: string,
    title: string,
    category: string,
    daysBeforeEvent: number,
    priority: Task['priority'],
    status: Task['status'],
  ): Task => {
    const deadline = new Date(eventDate);
    deadline.setDate(deadline.getDate() - daysBeforeEvent);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id, eventId: 'demo-birthday-001', title, category,
      deadline: deadline.toISOString().split('T')[0],
      priority, status, dependsOn: [], notes: '',
      isOverdue: daysUntilDeadline < 0, daysUntilDeadline,
    };
  };

  return [
    makeTask('bt-1', 'Confirm date and create event profile', 'Planning', 90, 'critical', 'completed'),
    makeTask('bt-2', 'Set budget', 'Budget', 85, 'critical', 'completed'),
    makeTask('bt-3', 'Finalize guest list', 'Guests', 75, 'high', 'completed'),
    makeTask('bt-4', 'Book venue', 'Venue', 60, 'critical', 'completed'),
    makeTask('bt-5', 'Send invitations', 'Invitations', 45, 'critical', 'completed'),
    makeTask('bt-6', 'Order birthday cake', 'Catering', 30, 'critical', 'in_progress'),
    makeTask('bt-7', 'Book caterer / arrange food', 'Catering', 30, 'high', 'not_started'),
    makeTask('bt-8', 'Plan decorations theme', 'Decoration', 30, 'medium', 'in_progress'),
    makeTask('bt-9', 'Book entertainment', 'Entertainment', 30, 'medium', 'completed'),
    makeTask('bt-10', 'Book photographer', 'Photography', 21, 'medium', 'not_started'),
    makeTask('bt-11', 'Purchase party supplies', 'Decoration', 14, 'medium', 'not_started'),
    makeTask('bt-12', 'Confirm final guest count', 'Guests', 7, 'high', 'not_started'),
    makeTask('bt-13', 'Setup and decoration', 'Decoration', 1, 'critical', 'not_started'),
  ];
}

function buildCommunityTasks(): Task[] {
  const today = new Date();
  const eventDate = new Date(COMMUNITY_EVENT.date);
  
  const makeTask = (
    id: string,
    title: string,
    category: string,
    daysBeforeEvent: number,
    priority: Task['priority'],
    status: Task['status'],
  ): Task => {
    const deadline = new Date(eventDate);
    deadline.setDate(deadline.getDate() - daysBeforeEvent);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id, eventId: 'demo-community-001', title, category,
      deadline: deadline.toISOString().split('T')[0],
      priority, status, dependsOn: [], notes: '',
      isOverdue: daysUntilDeadline < 0, daysUntilDeadline,
    };
  };

  return [
    makeTask('ct-1', 'Define event purpose and goals', 'Planning', 180, 'critical', 'completed'),
    makeTask('ct-2', 'Confirm date and budget', 'Budget', 175, 'critical', 'completed'),
    makeTask('ct-3', 'Secure permits and insurance', 'Permits', 150, 'critical', 'completed'),
    makeTask('ct-4', 'Book venue', 'Venue', 150, 'critical', 'completed'),
    makeTask('ct-5', 'Form organizing committee', 'Planning', 150, 'high', 'completed'),
    makeTask('ct-6', 'Launch marketing campaign', 'Marketing', 120, 'high', 'completed'),
    makeTask('ct-7', 'Book catering service', 'Catering', 90, 'high', 'in_progress'),
    makeTask('ct-8', 'Hire security team', 'Security', 90, 'critical', 'not_started'),
    makeTask('ct-9', 'Book audio/visual equipment', 'Audio/Visual', 90, 'high', 'in_progress'),
    makeTask('ct-10', 'Recruit volunteers', 'Volunteers', 75, 'high', 'in_progress'),
    makeTask('ct-11', 'Finalize speaker / performer lineup', 'Entertainment', 45, 'high', 'not_started'),
    makeTask('ct-12', 'Conduct volunteer training', 'Volunteers', 14, 'high', 'not_started'),
    makeTask('ct-13', 'Site walkthrough and setup plan', 'Venue', 7, 'critical', 'not_started'),
    makeTask('ct-14', 'Final briefing with all teams', 'Planning', 2, 'critical', 'not_started'),
  ];
}

// ---- Demo Plan Builders ----

export function getWeddingDemoPlan(): EventPlan {
  return {
    event: WEDDING_EVENT,
    budget: buildWeddingBudget(),
    tasks: buildWeddingTasks(),
    vendors: WEDDING_VENDORS,
    recommendations: WEDDING_RECOMMENDATIONS,
    scenarios: [],
    chat: [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Welcome! I'm your AI planning assistant for **${WEDDING_EVENT.name}**. 

You have **180 guests**, a **₹8L budget**, and **6 months** to plan. Your venue is confirmed and photography is booked — great start!

Your most urgent priority is booking your caterer. Premium vegetarian caterers in Mumbai book out 4-6 months in advance, and your event is 6 months away.

How can I help you today?`,
        timestamp: new Date().toISOString(),
      },
    ],
    generatedAt: new Date().toISOString(),
    planVersion: 1,
  };
}

export function getBirthdayDemoPlan(): EventPlan {
  return {
    event: BIRTHDAY_EVENT,
    budget: buildBirthdayBudget(),
    tasks: buildBirthdayTasks(),
    vendors: [
      { id: 'bv-1', eventId: 'demo-birthday-001', category: 'Venue', name: 'Skyline Terrace', estimatedCost: 37500, status: 'booked', contactInfo: '+91 40 2222 3333', deadline: '2026-11-15', notes: 'Rooftop confirmed, deposit paid' },
      { id: 'bv-2', eventId: 'demo-birthday-001', category: 'Entertainment', name: 'Acoustic Duo - Strings & Keys', estimatedCost: 18000, status: 'booked', contactInfo: '+91 98001 23456', deadline: '2026-11-10', notes: '3-hour set confirmed' },
      { id: 'bv-3', eventId: 'demo-birthday-001', category: 'Catering', name: 'Hetal\'s Kitchen', estimatedCost: 36000, status: 'contacted', contactInfo: '+91 98765 11111', deadline: '2026-11-01', notes: 'Menu discussion pending' },
      { id: 'bv-4', eventId: 'demo-birthday-001', category: 'Cake', name: 'Sugar Craft Studio', estimatedCost: 8500, status: 'researching', contactInfo: '', deadline: '2026-11-01', notes: '5-tier customized cake inquiry sent' },
    ],
    recommendations: [
      {
        id: 'br-1', type: 'risk', title: 'Caterer not yet confirmed — 45 days to go',
        explanation: 'With 60 guests and only 45 days remaining, your catering is still "contacted" status. Rooftop caterers often require 3-4 weeks to confirm menus and logistics.',
        impact: 'high', priority: 'urgent', suggestedAction: 'Confirm Hetal\'s Kitchen this week or identify backup', dismissed: false,
      },
      {
        id: 'br-2', type: 'personalization', title: 'Photo booth will be a highlight moment',
        explanation: 'For a 30th birthday with 60 guests in a rooftop boho setting, a photo booth with customized props and instant prints creates high-value memories. Your ₹12,000 photography budget comfortably covers this.',
        impact: 'medium', priority: 'medium', suggestedAction: 'Book a combined photographer + photo booth package', dismissed: false,
      },
    ],
    scenarios: [],
    chat: [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Welcome! I'm helping plan **${BIRTHDAY_EVENT.name}** 🎉

You're **45 days out** with a **₹1.5L budget** and 60 guests. Venue and entertainment are confirmed — nice work!

Your most urgent task is confirming catering. At ₹750/person for 60 guests, that's your biggest unconfirmed expense.

What would you like to work on?`,
        timestamp: new Date().toISOString(),
      },
    ],
    generatedAt: new Date().toISOString(),
    planVersion: 1,
  };
}

export function getCommunityDemoPlan(): EventPlan {
  return {
    event: COMMUNITY_EVENT,
    budget: buildCommunityBudget(),
    tasks: buildCommunityTasks(),
    vendors: [
      { id: 'cv-1', eventId: 'demo-community-001', category: 'Venue', name: 'KTPO Convention Center', estimatedCost: 100000, status: 'confirmed', contactInfo: '+91 80 2839 4455', deadline: '2027-01-01', notes: 'Hall A + Hall B booked' },
      { id: 'cv-2', eventId: 'demo-community-001', category: 'Audio/Visual', name: 'TechSound AV Solutions', estimatedCost: 55000, status: 'booked', contactInfo: '+91 98001 55555', deadline: '2026-12-15', notes: 'LED wall + sound system' },
      { id: 'cv-3', eventId: 'demo-community-001', category: 'Catering', name: 'CityBistro Corporate Catering', estimatedCost: 145000, status: 'contacted', contactInfo: '+91 80 4444 5555', deadline: '2026-12-01', notes: 'Buffet quote pending' },
      { id: 'cv-4', eventId: 'demo-community-001', category: 'Security', name: 'SecurePro Events', estimatedCost: 22000, status: 'researching', contactInfo: '', deadline: '2026-12-10', notes: 'Need to finalize headcount' },
    ],
    recommendations: [
      {
        id: 'cr-1', type: 'risk', title: 'Security team not yet booked',
        explanation: 'With 500 attendees at a convention center, security is a legal and safety requirement. At 90 days out, reputable security firms are in high demand for December events in Bangalore.',
        impact: 'high', priority: 'urgent', suggestedAction: 'Book security firm within 1 week', dismissed: false,
      },
      {
        id: 'cr-2', type: 'personalization', title: 'Live streaming will 10x your reach',
        explanation: 'For a tech conference with 500 physical attendees, live streaming can reach 5,000+ online viewers. Your ₹60,000 AV budget can be extended by ₹10,000 to include streaming equipment.',
        impact: 'high', priority: 'medium', suggestedAction: 'Ask TechSound AV to include live streaming in their package', dismissed: false,
      },
    ],
    scenarios: [],
    chat: [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Hello! I'm your planning assistant for **${COMMUNITY_EVENT.name}**.

You have **500 attendees**, a **₹5L budget**, and **90 days** to go. Venue is confirmed and AV is booked — solid foundation!

Your most urgent gap is hiring security. For a 500-person event at KTPO, you need 8-12 security personnel confirmed well in advance.

What would you like to focus on?`,
        timestamp: new Date().toISOString(),
      },
    ],
    generatedAt: new Date().toISOString(),
    planVersion: 1,
  };
}

export const DEMO_PLANS = {
  wedding: getWeddingDemoPlan,
  birthday: getBirthdayDemoPlan,
  community: getCommunityDemoPlan,
};

export { WEDDING_EVENT, BIRTHDAY_EVENT, COMMUNITY_EVENT };
