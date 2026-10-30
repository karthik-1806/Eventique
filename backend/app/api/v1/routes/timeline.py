"""Timeline generation and calculation endpoints."""

from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from app.engines.timeline_engine import calculate_task_stats, generate_tasks_for_event
from app.models.enums import EventType
from app.schemas.timeline import Task, TaskStats

router = APIRouter()


class GenerateTimelineRequest(BaseModel):
    eventId: str
    eventType: EventType
    eventDate: str


class TaskStatsRequest(BaseModel):
    tasks: List[Task]


@router.post("/timeline/generate", response_model=List[Task])
def generate_timeline_endpoint(req: GenerateTimelineRequest):
    return generate_tasks_for_event(req.eventId, req.eventType, req.eventDate)


@router.post("/timeline/stats", response_model=TaskStats)
def task_stats_endpoint(req: TaskStatsRequest):
    return calculate_task_stats(req.tasks)
