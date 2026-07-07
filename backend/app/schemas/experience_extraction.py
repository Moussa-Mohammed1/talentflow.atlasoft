from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.skill_extraction import DetectedSectionRead


class ExperienceItemRead(BaseModel):
    title: str
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    section: str
    evidence: list[str] = Field(default_factory=list)


class ResumeExperienceAnalysisRead(BaseModel):
    sections: list[DetectedSectionRead] = Field(default_factory=list)
    experiences: list[ExperienceItemRead] = Field(default_factory=list)
    stats: dict[str, Any] = Field(default_factory=dict)


class ResumeExperienceRead(BaseModel):
    raw_text: str
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)
    analysis: ResumeExperienceAnalysisRead

    model_config = ConfigDict(from_attributes=True)
