from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.notification import NotificationType


class NotificationCreate(BaseModel):
    recruiter_id: int
    title: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=2000)
    type: NotificationType = NotificationType.INFO


class NotificationRead(BaseModel):
    id: int
    recruiter_id: int
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListRead(BaseModel):
    items: list[NotificationRead]
    unread_count: int


class NotificationMarkAllRead(BaseModel):
    updated_count: int


class CandidateMatchingCompletedEvent(BaseModel):
    candidate_name: str = Field(min_length=1, max_length=160)
    match_count: int = Field(ge=0)
