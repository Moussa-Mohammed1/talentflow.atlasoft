from __future__ import annotations

from dataclasses import dataclass

from app.services.skill_extraction.models import CandidateRecord, SectionSpan
from app.services.skill_extraction.ontology import SkillOntology


@dataclass(frozen=True)
class CategoryDecision:
    category: str
    canonical: str | None
    confidence: float
    source: str


class SkillCategoryClassifier:
    def __init__(self, ontology: SkillOntology) -> None:
        self.ontology = ontology

    def classify(self, candidate: str, section: SectionSpan, record: CandidateRecord, semantic_hint: float = 0.0) -> CategoryDecision:
        concept = self.ontology.resolve_concept(candidate)
        if concept is not None:
            return CategoryDecision(concept.category, concept.canonical, 1.0, "concept")

        category, canonical, confidence = self.ontology.category_for(candidate, section.name, semantic_hint)
        if canonical is not None:
            return CategoryDecision(category, canonical, confidence, "concept")

        source = "semantic" if confidence >= 0.35 else "surface"
        if category == "Competency" and record.sources.get("layout", 0.0) > 0 and section.name == "technical_skills":
            category = "Technology"
            confidence = max(confidence, 0.55)
            source = "layout"

        return CategoryDecision(category, None, confidence, source)
