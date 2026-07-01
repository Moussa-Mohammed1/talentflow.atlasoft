from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SkillSignalsRead(BaseModel):
    ner_score: float = 0.0
    semantic_score: float = 0.0
    section_score: float = 0.0
    frequency_score: float = 0.0
    context_score: float = 0.0


class DetectedSectionRead(BaseModel):
    name: str
    heading: str
    start_line: int
    end_line: int
    confidence: float = 0.0


class SkillItemRead(BaseModel):
    original: str
    normalized: str
    name: str
    category: str
    confidence: float
    section: str
    source: str
    signals: SkillSignalsRead = Field(default_factory=SkillSignalsRead)


class ResumeSkillAnalysisRead(BaseModel):
    sections: list[DetectedSectionRead] = Field(default_factory=list)
    technologies: list[SkillItemRead] = Field(default_factory=list)
    competencies: list[SkillItemRead] = Field(default_factory=list)
    skills_by_category: dict[str, list[SkillItemRead]] = Field(default_factory=dict)
    flattened_skills: list[str] = Field(default_factory=list)


class ResumeAnalysisRead(BaseModel):
    raw_text: str
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)
    analysis: ResumeSkillAnalysisRead
    experience: dict | None = None
    languages: dict | None = None
    educations: dict | None = None
    certifications: dict | None = None

    model_config = ConfigDict(from_attributes=True)
