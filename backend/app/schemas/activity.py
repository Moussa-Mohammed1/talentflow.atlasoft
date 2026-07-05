from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ActivityRead(BaseModel):
    id: int
    type: str
    description: str
    candidate_name: str | None = None
    recruiter_name: str | None = None
    invited_name: str | None = None
    created_at: datetime


class ActivityListRead(BaseModel):
    items: list[ActivityRead]
