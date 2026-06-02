from typing import Any
from dataclasses import asdict, dataclass, field


@dataclass(frozen=True)
class CandidateScore:
    value: str
    confidence: float
    evidence: list[str] = field(default_factory=list)
    signals: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "value": self.value,
            "confidence": round(self.confidence, 4),
            "evidence": self.evidence,
        }


@dataclass(frozen=True)
class IdentityExtractionResult:
    name: CandidateScore
    email: CandidateScore
    phone: CandidateScore
    stats: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name.to_dict(),
            "email": self.email.to_dict(),
            "phone": self.phone.to_dict(),
            "stats": self.stats,
        }
