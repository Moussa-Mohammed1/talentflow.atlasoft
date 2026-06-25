from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class LanguageProficiency:
    level: str
    confidence: float = 0.0
    evidence: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "level": self.level,
            "confidence": round(self.confidence, 4),
            "evidence": self.evidence,
        }


@dataclass(frozen=True)
class LanguageMention:
    language: str
    proficiency: LanguageProficiency | None = None
    confidence: float = 0.0
    section: str = ""
    sources: list[str] = field(default_factory=list)
    evidence: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "language": self.language,
            "proficiency": self.proficiency.to_dict() if self.proficiency else None,
            "confidence": round(self.confidence, 4),
            "section": self.section,
            "sources": self.sources,
            "evidence": self.evidence,
        }


@dataclass(frozen=True)
class LanguageExtractionResult:
    raw_text: str
    sections: list[dict[str, Any]]
    languages: list[LanguageMention]
    stats: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "raw_text": self.raw_text,
            "sections": self.sections,
            "languages": [lang.to_dict() for lang in self.languages],
            "stats": self.stats,
        }
