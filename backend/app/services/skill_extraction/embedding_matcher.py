from __future__ import annotations

from dataclasses import dataclass

from app.services.skill_extraction.ontology import SkillOntology


@dataclass(frozen=True)
class EmbeddingMatch:
    canonical: str | None
    confidence: float
    source: str

    @property
    def matched(self) -> bool:
        return self.canonical is not None and self.confidence > 0


class EmbeddingSkillMatcher:
    def __init__(self, ontology: SkillOntology) -> None:
        self.ontology = ontology

    def match(self, candidate: str) -> EmbeddingMatch:
        canonical, score = self.ontology.closest_concept(candidate)
        if canonical is None:
            semantic_score = self.ontology.semantic_score(candidate)
            return EmbeddingMatch(None, semantic_score, "embedding")
        return EmbeddingMatch(canonical, score, "embedding")

    @property
    def available(self) -> bool:
        self.ontology.ensure_embeddings()
        return self.ontology._embedding_model is not None
