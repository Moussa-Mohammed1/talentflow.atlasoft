from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.services.skill_extraction.models import SectionSpan


@dataclass(frozen=True)
class EducationMention:
    institution: str
    degree: str | None
    field_of_study: str | None
    start_date: datetime | None
    end_date: datetime | None
    description: str | None
    confidence: float
    section: str
    evidence: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "institution": self.institution,
            "degree": self.degree,
            "field_of_study": self.field_of_study,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "description": self.description,
            "confidence": self.confidence,
            "section": self.section,
            "evidence": self.evidence,
        }


@dataclass(frozen=True)
class EducationExtractionResult:
    raw_text: str
    sections: list[SectionSpan]
    educations: list[EducationMention]
    stats: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "raw_text": self.raw_text,
            "sections": [section.to_dict() for section in self.sections],
            "educations": [edu.to_dict() for edu in self.educations],
            "stats": self.stats,
        }
