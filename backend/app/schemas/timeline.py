"""Timeline and Task Schemas."""

from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import TaskPriority, TaskStatus


class Task(BaseModel):
    id: str
    eventId: str
    title: str = Field(..., min_length=1, max_length=200)
    category: str
    deadline: str
    priority: TaskPriority
    status: TaskStatus = TaskStatus.NOT_STARTED
    dependsOn: List[str] = Field(default_factory=list)
    notes: Optional[str] = ""
    aiGenerated: Optional[bool] = False
    isOverdue: Optional[bool] = False
    daysUntilDeadline: Optional[int] = None


class TaskStats(BaseModel):
    total: int
    completed: int
    inProgress: int
    overdue: int
    blocked: int
    critical: int
    completionPercent: int

