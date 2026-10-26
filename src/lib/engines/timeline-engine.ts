// ============================================================
// TIMELINE ENGINE — Deterministic timeline & task generation
// ============================================================

import type { Task, EventProfile, EventType, TaskStatus, TaskPriority } from '@/lib/models/types';
import { v4 as uuidv4 } from 'uuid';

interface TaskTemplate {
  title: string;
  category: string;
  daysBeforeEvent: number; // positive = days before event
  priority: TaskPriority;
  dependsOnTitles?: string[];
}

const TASK_TEMPLATES: Record<EventType, TaskTemplate[]> = {
  wedding: [
    { title: 'Set wedding date and create event profile', category: 'Planning', daysBeforeEvent: 365, priority: 'critical' },
    { title: 'Establish total budget', category: 'Budget', daysBeforeEvent: 360, priority: 'critical' },
    { title: 'Book venue', category: 'Venue', daysBeforeEvent: 300, priority: 'critical' },
    { title: 'Hire wedding planner / coordinator', category: 'Planning', daysBeforeEvent: 300, priority: 'high' },
    { title: 'Finalize guest list', category: 'Guests', daysBeforeEvent: 270, priority: 'critical' },
    { title: 'Book caterer', category: 'Catering', daysBeforeEvent: 240, priority: 'critical' },
    { title: 'Book photographer & videographer', category: 'Photography', daysBeforeEvent: 240, priority: 'critical' },
    { title: 'Book entertainment / band / DJ', category: 'Entertainment', daysBeforeEvent: 210, priority: 'high' },
    { title: 'Choose and order wedding attire', category: 'Attire', daysBeforeEvent: 200, priority: 'high' },
    { title: 'Book makeup & hair', category: 'Beauty', daysBeforeEvent: 180, priority: 'high' },
    { title: 'Book florist & decorator', category: 'Decoration', daysBeforeEvent: 180, priority: 'high' },
    { title: 'Send save-the-dates', category: 'Invitations', daysBeforeEvent: 180, priority: 'medium' },
    { title: 'Arrange accommodation for out-of-town guests', category: 'Accommodation', daysBeforeEvent: 150, priority: 'medium' },
    { title: 'Book transportation', category: 'Transportation', daysBeforeEvent: 120, priority: 'medium' },
    { title: 'Finalize menu with caterer', category: 'Catering', daysBeforeEvent: 90, priority: 'high' },
    { title: 'Send formal wedding invitations', category: 'Invitations', daysBeforeEvent: 90, priority: 'critical' },
    { title: 'Arrange wedding cake', category: 'Catering', daysBeforeEvent: 90, priority: 'high' },
    { title: 'Purchase wedding rings', category: 'Rings', daysBeforeEvent: 75, priority: 'critical' },
    { title: 'Confirm all vendor bookings', category: 'Vendors', daysBeforeEvent: 60, priority: 'critical' },
    { title: 'Final dress / attire fitting', category: 'Attire', daysBeforeEvent: 45, priority: 'high' },
    { title: 'Create day-of timeline', category: 'Planning', daysBeforeEvent: 30, priority: 'critical' },
    { title: 'Follow up on RSVPs', category: 'Guests', daysBeforeEvent: 30, priority: 'high' },
    { title: 'Final guest count to caterer', category: 'Catering', daysBeforeEvent: 14, priority: 'critical' },
    { title: 'Confirm venue setup details', category: 'Venue', daysBeforeEvent: 14, priority: 'high' },
    { title: 'Prepare wedding day emergency kit', category: 'Planning', daysBeforeEvent: 7, priority: 'medium' },
    { title: 'Wedding rehearsal', category: 'Planning', daysBeforeEvent: 2, priority: 'critical' },
  ],
  birthday: [
    { title: 'Confirm date and create event profile', category: 'Planning', daysBeforeEvent: 90, priority: 'critical' },
    { title: 'Set budget', category: 'Budget', daysBeforeEvent: 85, priority: 'critical' },
    { title: 'Finalize guest list', category: 'Guests', daysBeforeEvent: 75, priority: 'high' },
    { title: 'Book venue', category: 'Venue', daysBeforeEvent: 60, priority: 'critical' },
    { title: 'Send invitations', category: 'Invitations', daysBeforeEvent: 45, priority: 'critical' },
    { title: 'Order birthday cake', category: 'Catering', daysBeforeEvent: 30, priority: 'critical' },
    { title: 'Book caterer / arrange food', category: 'Catering', daysBeforeEvent: 30, priority: 'high' },
    { title: 'Plan decorations theme', category: 'Decoration', daysBeforeEvent: 30, priority: 'medium' },
    { title: 'Book entertainment', category: 'Entertainment', daysBeforeEvent: 30, priority: 'medium' },
    { title: 'Book photographer', category: 'Photography', daysBeforeEvent: 21, priority: 'medium' },
    { title: 'Purchase party supplies & decorations', category: 'Decoration', daysBeforeEvent: 14, priority: 'medium' },
    { title: 'Confirm final guest count', category: 'Guests', daysBeforeEvent: 7, priority: 'high' },
    { title: 'Confirm all vendor bookings', category: 'Vendors', daysBeforeEvent: 7, priority: 'high' },
    { title: 'Setup and decoration', category: 'Decoration', daysBeforeEvent: 1, priority: 'critical' },
  ],
  community: [
    { title: 'Define event purpose and goals', category: 'Planning', daysBeforeEvent: 180, priority: 'critical' },
    { title: 'Confirm date and budget', category: 'Budget', daysBeforeEvent: 175, priority: 'critical' },
    { title: 'Secure permits and insurance', category: 'Permits', daysBeforeEvent: 150, priority: 'critical' },
    { title: 'Book venue', category: 'Venue', daysBeforeEvent: 150, priority: 'critical' },
    { title: 'Form organizing committee', category: 'Planning', daysBeforeEvent: 150, priority: 'high' },
    { title: 'Launch marketing campaign', category: 'Marketing', daysBeforeEvent: 120, priority: 'high' },
    { title: 'Book catering service', category: 'Catering', daysBeforeEvent: 90, priority: 'high' },
    { title: 'Hire security team', category: 'Security', daysBeforeEvent: 90, priority: 'critical' },
    { title: 'Book audio/visual equipment', category: 'Audio/Visual', daysBeforeEvent: 90, priority: 'high' },
    { title: 'Recruit volunteers', category: 'Volunteers', daysBeforeEvent: 75, priority: 'high' },
    { title: 'Arrange transportation plan', category: 'Transportation', daysBeforeEvent: 60, priority: 'medium' },
    { title: 'Confirm sponsor commitments', category: 'Sponsors', daysBeforeEvent: 60, priority: 'high' },
    { title: 'Send formal invitations / promote event', category: 'Marketing', daysBeforeEvent: 45, priority: 'critical' },
    { title: 'Finalize speaker / performer lineup', category: 'Entertainment', daysBeforeEvent: 45, priority: 'high' },
    { title: 'Conduct volunteer training', category: 'Volunteers', daysBeforeEvent: 14, priority: 'high' },
    { title: 'Confirm all vendor arrangements', category: 'Vendors', daysBeforeEvent: 14, priority: 'critical' },
    { title: 'Site walkthrough and setup plan', category: 'Venue', daysBeforeEvent: 7, priority: 'critical' },
    { title: 'Final briefing with all teams', category: 'Planning', daysBeforeEvent: 2, priority: 'critical' },
  ],
};

/**
 * Generate a deterministic task list from an event profile.
 */
export function generateTasks(event: EventProfile): Task[] {
  const eventDate = new Date(event.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const templates = TASK_TEMPLATES[event.type];

  return templates.map((template) => {
    const deadline = new Date(eventDate);
    deadline.setDate(deadline.getDate() - template.daysBeforeEvent);

    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isOverdue = daysUntilDeadline < 0;

    let status: TaskStatus = 'not_started';
    if (daysUntilDeadline < -14) {
      // Significantly past deadline
      status = 'not_started';
    }

    return {
      id: uuidv4(),
      eventId: event.id,
      title: template.title,
      category: template.category,
      deadline: deadline.toISOString().split('T')[0],
      priority: template.priority,
      status,
      dependsOn: [],
      notes: '',
      aiGenerated: false,
      isOverdue,
      daysUntilDeadline,
    };
  });
}

/**
 * Recalculate task deadlines when event date changes.
 */
export function recalculateTaskDeadlines(tasks: Task[], event: EventProfile): Task[] {
  const eventDate = new Date(event.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const templates = TASK_TEMPLATES[event.type];

  return tasks.map((task) => {
    const template = templates.find((t) => t.title === task.title);
    if (!template) return updateTaskDeadlineInfo(task, today);

    const deadline = new Date(eventDate);
    deadline.setDate(deadline.getDate() - template.daysBeforeEvent);

    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      ...task,
      deadline: deadline.toISOString().split('T')[0],
      isOverdue: daysUntilDeadline < 0,
      daysUntilDeadline,
    };
  });
}

function updateTaskDeadlineInfo(task: Task, today: Date): Task {
  const deadline = new Date(task.deadline);
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return { ...task, isOverdue: daysUntilDeadline < 0, daysUntilDeadline };
}

/**
 * Update all task deadline info (run on app load or date changes).
 */
export function refreshTaskDeadlines(tasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tasks.map((task) => updateTaskDeadlineInfo(task, today));
}

/**
 * Get task statistics.
 */
export function getTaskStats(tasks: Task[]) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const overdue = tasks.filter((t) => t.isOverdue && t.status !== 'completed').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const critical = tasks.filter((t) => t.priority === 'critical' && t.status !== 'completed').length;

  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, inProgress, overdue, blocked, critical, completionPercent };
}

/**
 * Get upcoming tasks within N days.
 */
export function getUpcomingTasks(tasks: Task[], withinDays: number = 30): Task[] {
  return tasks
    .filter(
      (t) =>
        t.status !== 'completed' &&
        t.daysUntilDeadline !== undefined &&
        t.daysUntilDeadline >= 0 &&
        t.daysUntilDeadline <= withinDays,
    )
    .sort((a, b) => (a.daysUntilDeadline ?? 0) - (b.daysUntilDeadline ?? 0));
}

/**
 * Get days until event.
 */
export function getDaysUntilEvent(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  return Math.ceil((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get planning progress percentage.
 */
export function getPlanningProgress(tasks: Task[]): number {
  const completable = tasks.filter((t) => t.priority !== 'low');
  if (completable.length === 0) return 0;
  const done = completable.filter((t) => t.status === 'completed').length;
  return Math.round((done / completable.length) * 100);
}
