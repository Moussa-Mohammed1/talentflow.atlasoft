from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.services.skill_extraction.models import SectionSpan


@dataclass(frozen=True)
class CertificationMention:
    name: str
    organization: str | None
    issue_date: datetime | None
    expiration_date: datetime | None
    credential_id: str | None
    credential_url: str | None
    description: str | None
    confidence: float
    section: str
    evidence: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "organization": self.organization,
            "issue_date": self.issue_date.isoformat() if self.issue_date else None,
            "expiration_date": self.expiration_date.isoformat() if self.expiration_date else None,
            "credential_id": self.credential_id,
            "credential_url": self.credential_url,
            "description": self.description,
            "confidence": self.confidence,
            "section": self.section,
            "evidence": self.evidence,
        }


@dataclass(frozen=True)
class CertificationExtractionResult:
    raw_text: str
    sections: list[SectionSpan]
    certifications: list[CertificationMention]
    stats: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "raw_text": self.raw_text,
            "sections": [section.to_dict() for section in self.sections],
            "certifications": [cert.to_dict() for cert in self.certifications],
            "stats": self.stats,
        }
