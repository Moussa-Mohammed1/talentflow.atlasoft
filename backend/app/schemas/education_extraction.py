from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.skill_extraction import DetectedSectionRead


class EducationItemRead(BaseModel):
    institution: str
    degree: str | None = None
    field_of_study: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    description: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    section: str
    evidence: list[str] = Field(default_factory=list)


class ResumeEducationAnalysisRead(BaseModel):
    sections: list[DetectedSectionRead] = Field(default_factory=list)
    educations: list[EducationItemRead] = Field(default_factory=list)
    stats: dict[str, Any] = Field(default_factory=dict)


class ResumeEducationRead(BaseModel):
    raw_text: str
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)
    analysis: ResumeEducationAnalysisRead

    model_config = ConfigDict(from_attributes=True)
