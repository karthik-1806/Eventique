"""Deterministic Timeline Engine in Python.
Computes tasks, deadlines, countdowns, and schedule compressions.
"""

from datetime import datetime, timedelta, timezone
import uuid
from typing import Dict, List, Optional
from app.models.enums import EventType, TaskPriority, TaskStatus
from app.schemas.timeline import Task, TaskStats

TASK_TEMPLATES: Dict[EventType, List[Dict]] = {
    EventType.WEDDING: [
        {"title": "Book Wedding Venue", "category": "Venue", "daysBefore": 300, "priority": TaskPriority.CRITICAL},
        {"title": "Hire Wedding Photographer & Videographer", "category": "Photography", "daysBefore": 240, "priority": TaskPriority.HIGH},
        {"title": "Finalize Catering Menu & Tasting", "category": "Catering", "daysBefore": 180, "priority": TaskPriority.CRITICAL},
        {"title": "Book Decorator & Floral Designer", "category": "Decoration", "daysBefore": 150, "priority": TaskPriority.HIGH},
        {"title": "Select Wedding Attire", "category": "Attire", "daysBefore": 120, "priority": TaskPriority.HIGH},
        {"title": "Send Wedding Invitations", "category": "Invitations", "daysBefore": 75, "priority": TaskPriority.CRITICAL},
        {"title": "Book Music / DJ & Sound Setup", "category": "Entertainment", "daysBefore": 60, "priority": TaskPriority.MEDIUM},
        {"title": "Arrange Guest Transportation & Shuttles", "category": "Logistics", "daysBefore": 45, "priority": TaskPriority.MEDIUM},
        {"title": "Confirm Guest Accommodation & Room Blocks", "category": "Logistics", "daysBefore": 30, "priority": TaskPriority.HIGH},
        {"title": "Final Headcount to Caterer", "category": "Catering", "daysBefore": 14, "priority": TaskPriority.CRITICAL},
        {"title": "Final Walkthrough at Venue", "category": "Venue", "daysBefore": 7, "priority": TaskPriority.CRITICAL},
        {"title": "Pack Wedding Day Emergency Kit", "category": "Planning", "daysBefore": 2, "priority": TaskPriority.LOW},
    ],
    EventType.BIRTHDAY: [
        {"title": "Select & Book Party Venue", "category": "Venue", "daysBefore": 60, "priority": TaskPriority.CRITICAL},
        {"title": "Finalize Party Theme & Entertainment", "category": "Entertainment", "daysBefore": 45, "priority": TaskPriority.HIGH},
        {"title": "Order Custom Cake & Catering", "category": "Catering", "daysBefore": 30, "priority": TaskPriority.CRITICAL},
        {"title": "Send Digital Party Invitations", "category": "Invitations", "daysBefore": 21, "priority": TaskPriority.HIGH},
        {"title": "Purchase Decorations, Favors & Balloons", "category": "Decoration", "daysBefore": 14, "priority": TaskPriority.MEDIUM},
        {"title": "Confirm RSVP Headcount", "category": "Planning", "daysBefore": 7, "priority": TaskPriority.HIGH},
        {"title": "Pick Up Cake & Final Supplies", "category": "Catering", "daysBefore": 1, "priority": TaskPriority.CRITICAL},
    ],
    EventType.COMMUNITY: [
        {"title": "Secure Venue & Municipal Permits", "category": "Permits", "daysBefore": 90, "priority": TaskPriority.CRITICAL},
        {"title": "Book Audio/Visual & Stage Production", "category": "Production", "daysBefore": 60, "priority": TaskPriority.CRITICAL},
        {"title": "Recruit & Schedule Volunteer Teams", "category": "Volunteers", "daysBefore": 45, "priority": TaskPriority.HIGH},
        {"title": "Confirm Security & First Aid Logistics", "category": "Safety", "daysBefore": 30, "priority": TaskPriority.CRITICAL},
        {"title": "Launch Marketing Campaign & Public Notice", "category": "Marketing", "daysBefore": 30, "priority": TaskPriority.HIGH},
        {"title": "Conduct Volunteer Briefing & Orientation", "category": "Volunteers", "daysBefore": 7, "priority": TaskPriority.HIGH},
        {"title": "Setup Venue, Signage & Soundcheck", "category": "Logistics", "daysBefore": 1, "priority": TaskPriority.CRITICAL},
    ],
}


def get_days_until_event(event_date_str: str) -> int:
    """Calculates days until event date."""
    try:
        event_dt = datetime.strptime(event_date_str.split("T")[0], "%Y-%m-%d").date()
        today = datetime.now(timezone.utc).date()
        return (event_dt - today).days
    except Exception:
        return 0


def generate_tasks_for_event(event_id: str, event_type: EventType, event_date_str: str) -> List[Task]:
    """
    Generates tasks with compressed scheduling for short planning windows
    to prevent immediate false overdue panics.
    """
    templates = TASK_TEMPLATES.get(event_type, TASK_TEMPLATES[EventType.WEDDING])
    days_left = max(1, get_days_until_event(event_date_str))
    today = datetime.now(timezone.utc).date()
    event_date = today + timedelta(days=days_left)

    tasks: List[Task] = []
    max_template_days = max(t["daysBefore"] for t in templates)

    # If lead time is shorter than template span, compress schedule proportionally
    compression_ratio = min(1.0, (days_left * 0.9) / max_template_days) if max_template_days > 0 else 1.0

    for item in templates:
        scheduled_days_before = int(round(item["daysBefore"] * compression_ratio))
        deadline_date = event_date - timedelta(days=scheduled_days_before)

        # Deadline cannot be earlier than today for newly planned events
        if deadline_date < today:
            deadline_date = today + timedelta(days=1)

        days_until_deadline = (deadline_date - today).days
        is_overdue = days_until_deadline < 0

        tasks.append(
            Task(
                id=str(uuid.uuid4()),
                eventId=event_id,
                title=item["title"],
                category=item["category"],
                deadline=deadline_date.isoformat(),
                priority=item["priority"],
                status=TaskStatus.NOT_STARTED,
                dependsOn=[],
                notes="",
                aiGenerated=False,
                isOverdue=is_overdue,
                daysUntilDeadline=days_until_deadline,
            )
        )

    return tasks


def calculate_task_stats(tasks: List[Task]) -> TaskStats:
    """Computes completion rates, overdue counts, and critical tasks."""
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
    in_progress = sum(1 for t in tasks if t.status == TaskStatus.IN_PROGRESS)
    overdue = sum(1 for t in tasks if t.isOverdue and t.status != TaskStatus.COMPLETED)
    blocked = sum(1 for t in tasks if t.status == TaskStatus.BLOCKED)
    critical = sum(1 for t in tasks if t.priority == TaskPriority.CRITICAL and t.status != TaskStatus.COMPLETED)
    completion_percent = int(round((completed / total) * 100)) if total > 0 else 0

    return TaskStats(
        total=total,
        completed=completed,
        inProgress=in_progress,
        overdue=overdue,
        blocked=blocked,
        critical=critical,
        completionPercent=completion_percent,
    )
