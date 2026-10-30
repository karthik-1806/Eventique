"""Tests for deterministic timeline engine."""

from app.engines.timeline_engine import (
    calculate_task_stats,
    generate_tasks_for_event,
    get_days_until_event,
)
from app.models.enums import EventType, TaskPriority, TaskStatus


def test_generate_tasks_wedding_lead_time_compression():
    # 90-day planning window compresses 300-day tasks to fit inside the lead time
    tasks = generate_tasks_for_event("test-1", EventType.WEDDING, "2026-12-30")
    assert len(tasks) > 5

    # Check critical tasks exist
    critical_tasks = [t for t in tasks if t.priority == TaskPriority.CRITICAL]
    assert len(critical_tasks) >= 3

    # Verify no tasks scheduled in the past for new plan
    stats = calculate_task_stats(tasks)
    assert stats.total == len(tasks)
    assert stats.completed == 0
    assert stats.completionPercent == 0


def test_task_stats_calculation():
    tasks = generate_tasks_for_event("test-1", EventType.BIRTHDAY, "2026-11-30")
    assert len(tasks) >= 5

    # Mark 2 tasks completed
    tasks[0].status = TaskStatus.COMPLETED
    tasks[1].status = TaskStatus.COMPLETED

    stats = calculate_task_stats(tasks)
    assert stats.completed == 2
    assert stats.completionPercent > 0

