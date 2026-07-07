from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.recruitment import RecruitmentPriority, RecruitmentStatus


class RecruitmentCreate(BaseModel):
    candidate_id: int = Field(..., description="Candidate ID")
    job_offer_id: UUID = Field(..., description="Job offer ID")
    priority: RecruitmentPriority = Field(default=RecruitmentPriority.MEDIUM)
    notes: str | None = Field(default=None)


class RecruitmentUpdate(BaseModel):
    status: RecruitmentStatus | None = Field(default=None)
    priority: RecruitmentPriority | None = Field(default=None)
    assigned_recruiter_id: int | None = Field(default=None)
    notes: str | None = Field(default=None)


class RecruitmentRead(BaseModel):
    id: UUID
    candidate_id: int
    job_offer_id: UUID
    compatibility_score: Decimal | None
    status: RecruitmentStatus
    priority: RecruitmentPriority
    assigned_recruiter_id: int | None
    created_by: int | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    interview_type: str = Field(default="online")
    scheduled_at: datetime = Field(..., description="Must be in the future")
    duration_minutes: int = Field(default=60, ge=15, le=480)
    location: str | None = Field(default=None)
    interviewer_name: str | None = Field(default=None)


class InterviewUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    interview_type: str | None = Field(default=None)
    scheduled_at: datetime | None = Field(default=None)
    duration_minutes: int | None = Field(default=None, ge=15, le=480)
    location: str | None = Field(default=None)
    interviewer_name: str | None = Field(default=None)
    status: str | None = Field(default=None)
    feedback: str | None = Field(default=None)
    rating: int | None = Field(default=None, ge=1, le=5)


class InterviewRead(BaseModel):
    id: UUID
    recruitment_id: UUID
    title: str
    interview_type: str
    scheduled_at: datetime
    duration_minutes: int
    location: str | None
    interviewer_name: str | None
    status: str
    feedback: str | None
    rating: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmailPreviewRequest(BaseModel):
    interview_date: str = Field(..., description="Interview date (e.g. 2026-07-20)")
    interview_time: str = Field(..., description="Interview time (e.g. 14:00)")
    duration_minutes: int = Field(default=60, ge=15, le=480)
    location: str | None = Field(default=None)
    recruiter_name: str = Field(..., min_length=1)
    company_name: str = Field(..., min_length=1)
    language: str = Field(default="french", description="Language for the email (e.g. french, english, arabic)")


class EmailPreviewResponse(BaseModel):
    subject: str
    body: str


class SendEmailRequest(BaseModel):
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)


class RecruitmentEmailRead(BaseModel):
    id: UUID
    recruitment_id: UUID
    email_type: str
    sender_email: str
    recipient_email: str
    subject: str
    body: str
    status: str
    provider_message_id: str | None
    sent_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
