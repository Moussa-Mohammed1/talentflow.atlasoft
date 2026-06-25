from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.job import JobStatus, JobType


class JobCreate(BaseModel):
    recruiter_id: int
    type: JobType
    target: str = Field(min_length=1, max_length=255)
    message: str | None = Field(default=None, max_length=2000)


class JobRead(BaseModel):
    id: int
    recruiter_id: int
    type: JobType
    target: str
    status: JobStatus
    message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobListRead(BaseModel):
    items: list[JobRead]
    running_count: int


class JobStatusUpdate(BaseModel):
    status: JobStatus
    message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None