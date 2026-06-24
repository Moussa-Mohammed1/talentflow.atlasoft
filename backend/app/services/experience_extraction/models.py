from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any

from app.services.skill_extraction.models import SectionSpan


@dataclass(frozen=True)
class ParsedDateRange:
    start_date: datetime
    end_date: datetime | None
    text: str
    start_index: int
    end_index: int


@dataclass(frozen=True)
class ExperienceMention:
    title: str
    description: str | None
    start_date: datetime
    end_date: datetime | None
    confidence: float
    section: str
    evidence: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ExperienceExtractionResult:
    raw_text: str
    sections: list[SectionSpan]
    experiences: list[ExperienceMention]
    stats: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "raw_text": self.raw_text,
            "sections": [section.to_dict() for section in self.sections],
            "experiences": [experience.to_dict() for experience in self.experiences],
            "stats": self.stats,
        }
