from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.job_offers import EmploymentType, JobOfferStatus, SeniorityLevel, WorkMode


class JobOfferGenerate(BaseModel):
    description: str = Field(..., min_length=1)


class JobOfferCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None)
    responsibilities: str | None = Field(default=None)
    department_id: int | None = Field(default=None)
    location: str | None = Field(default=None, max_length=255)
    required_experience_years: float | None = Field(default=None, ge=0.0)
    employment_type: EmploymentType
    work_mode: WorkMode
    seniority_level: SeniorityLevel
    status: JobOfferStatus = Field(default=JobOfferStatus.PUBLISHED)
    openings: int = Field(default=1, ge=1)
    publish_date: date | None = Field(default=None)
    closing_date: date | None = Field(default=None)


class JobOfferUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None)
    responsibilities: str | None = Field(default=None)
    department_id: int | None = Field(default=None)
    location: str | None = Field(default=None, max_length=255)
    required_experience_years: float | None = Field(default=None, ge=0.0)
    employment_type: EmploymentType | None = Field(default=None)
    work_mode: WorkMode | None = Field(default=None)
    seniority_level: SeniorityLevel | None = Field(default=None)
    status: JobOfferStatus | None = Field(default=None)
    openings: int | None = Field(default=None, ge=1)
    publish_date: date | None = Field(default=None)
    closing_date: date | None = Field(default=None)


class JobOfferRead(BaseModel):
    id: UUID
    title: str
    description: str | None
    responsibilities: str | None
    department_id: int | None
    location: str | None = None
    required_experience_years: float | None = None
    employment_type: EmploymentType
    work_mode: WorkMode
    seniority_level: SeniorityLevel
    status: JobOfferStatus
    openings: int
    publish_date: date | None
    closing_date: date | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
