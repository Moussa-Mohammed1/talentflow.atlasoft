from __future__ import annotations

from dataclasses import dataclass

from app.services.skill_extraction.models import SkillConcept
from app.services.skill_extraction.ontology import SkillOntology
from app.services.skill_extraction.skill_taxonomy import TaxonomyEntry, build_alias_index


@dataclass(frozen=True)
class OntologyMatch:
    canonical: str | None
    category: str | None
    confidence: float
    source: str

    @property
    def matched(self) -> bool:
        return self.canonical is not None and self.confidence > 0


class OntologyMatcher:
    def __init__(self, ontology: SkillOntology) -> None:
        self.ontology = ontology
        self.external_index: dict[str, TaxonomyEntry] = build_alias_index()

    def match(self, candidate: str) -> OntologyMatch:
        concept = self.ontology.resolve_concept(candidate)
        if concept is not None:
            return self._from_concept(concept)

        key = self.ontology.normalize_key(candidate)
        external = self.external_index.get(key)
        if external is not None:
            return OntologyMatch(
                canonical=external.canonical,
                category=external.category,
                confidence=1.0,
                source="external_ontology",
            )

        return OntologyMatch(None, None, 0.0, "none")

    @staticmethod
    def _from_concept(concept: SkillConcept) -> OntologyMatch:
        return OntologyMatch(
            canonical=concept.canonical,
            category=concept.category,
            confidence=1.0,
            source="local_ontology",
        )
