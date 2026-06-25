from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class LanguageProficiencyRead(BaseModel):
    level: str = ""
    confidence: float = 0.0
    evidence: list[str] = Field(default_factory=list)


class LanguageMentionRead(BaseModel):
    language: str = ""
    proficiency: LanguageProficiencyRead | None = None
    confidence: float = 0.0
    section: str = ""
    sources: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)


class ResumeLanguageAnalysisRead(BaseModel):
    sections: list[dict[str, Any]] = Field(default_factory=list)
    languages: list[LanguageMentionRead] = Field(default_factory=list)
    stats: dict[str, Any] = Field(default_factory=dict)


class ResumeLanguageRead(BaseModel):
    raw_text: str
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)
    analysis: ResumeLanguageAnalysisRead

    model_config = ConfigDict(from_attributes=True)
