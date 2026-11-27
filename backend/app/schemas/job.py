from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.job import JobStatus, JobType


class JobCreate(BaseModel):
    recruiter_id: int
    type: JobType
    target: str = Field(min_length=1, max_length=255)
    message: str | None = Field(default=None, max_length=2000)
    queue_name: str = Field(default="default", max_length=64)
    max_retries: int = Field(default=3, ge=0, le=20)
    celery_task_id: str | None = Field(default=None, max_length=255)
    current_step: str | None = Field(default=None, max_length=128)


class JobRead(BaseModel):
    id: int
    recruiter_id: int
    type: JobType
    target: str
    status: JobStatus
    celery_task_id: str | None = None
    queue_name: str = "default"
    progress: int = 0
    current_step: str | None = None
    retries: int = 0
    max_retries: int = 3
    message: str | None = None
    error_details: str | None = None
    result_payload: dict[str, Any] | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class JobListRead(BaseModel):
    items: list[JobRead]
    running_count: int


class JobStatusUpdate(BaseModel):
    status: JobStatus
    message: str | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    current_step: str | None = Field(default=None, max_length=128)
    retries: int | None = Field(default=None, ge=0)
    error_details: str | None = None
    result_payload: dict[str, Any] | None = None
    celery_task_id: str | None = Field(default=None, max_length=255)
    started_at: datetime | None = None
    completed_at: datetime | None = None


class JobAcceptedResponse(BaseModel):
    job_id: int
    celery_task_id: str | None = None
    status: JobStatus
    queue_name: str
    job: JobRead
