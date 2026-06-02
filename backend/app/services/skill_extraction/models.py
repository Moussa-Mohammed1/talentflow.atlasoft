from typing import Any, Iterable
from dataclasses import asdict, dataclass, field



@dataclass(frozen=True)
class SectionSpan:
    name: str
    heading: str
    start_line: int
    end_line: int
    start_char: int
    end_char: int
    confidence: float
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SkillConcept:
    canonical: str
    category: str
    aliases: tuple[str, ...]
    description: str


@dataclass
class CandidateRecord:
    original: str
    section: str
    section_score: float
    evidence: set[str] = field(default_factory=set)
    sources: dict[str, float] = field(default_factory=dict)
    count: int = 0
    ner_score: float = 0.0
    phrase_score: float = 0.0
    regex_score: float = 0.0
    context_score: float = 0.0
    validation_score: float = 0.0
    semantic_score: float = 0.0

    def add(self, source: str, score: float, evidence: str | None = None) -> None:
        self.count += 1
        self.sources[source] = max(score, self.sources.get(source, 0.0))
        if evidence:
            self.evidence.add(evidence.strip())
        if source == "ner":
            self.ner_score = max(self.ner_score, score)
        elif source == "phrase":
            self.phrase_score = max(self.phrase_score, score)
        elif source == "regex":
            self.regex_score = max(self.regex_score, score)
        elif source == "context":
            self.context_score = max(self.context_score, score)


@dataclass(frozen=True)
class SkillMention:
    original: str
    normalized: str
    category: str
    confidence: float
    section: str
    sources: list[str]
    evidence: list[str]
    count: int
    scores: dict[str, float]
    canonical: str | None = None
    exact_span: str | None = None
    matched_alias: str | None = None
    section_source: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SkillExtractionResult:
    raw_text: str
    sections: list[SectionSpan]
    skills: list[SkillMention]
    technologies: list[SkillMention]
    competencies: list[SkillMention]
    skills_by_category: dict[str, list[SkillMention]]
    stats: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "raw_text": self.raw_text,
            "sections": [section.to_dict() for section in self.sections],
            "skills": [skill.to_dict() for skill in self.skills],
            "technologies": [skill.to_dict() for skill in self.technologies],
            "competencies": [skill.to_dict() for skill in self.competencies],
            "skills_by_category": {
                category: [skill.to_dict() for skill in items]
                for category, items in self.skills_by_category.items()
            },
            "stats": self.stats,
        }

