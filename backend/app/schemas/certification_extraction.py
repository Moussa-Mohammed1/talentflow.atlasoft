from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.skill_extraction import DetectedSectionRead


class CertificationItemRead(BaseModel):
    name: str
    organization: str | None = None
    issue_date: datetime | None = None
    expiration_date: datetime | None = None
    credential_id: str | None = None
    credential_url: str | None = None
    description: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    section: str
    evidence: list[str] = Field(default_factory=list)


class ResumeCertificationAnalysisRead(BaseModel):
    sections: list[DetectedSectionRead] = Field(default_factory=list)
    certifications: list[CertificationItemRead] = Field(default_factory=list)
    stats: dict[str, Any] = Field(default_factory=dict)


class ResumeCertificationRead(BaseModel):
    raw_text: str
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)
    analysis: ResumeCertificationAnalysisRead

    model_config = ConfigDict(from_attributes=True)
