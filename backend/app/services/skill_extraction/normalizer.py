from __future__ import annotations

from app.services.skill_extraction.ontology import SkillOntology


class SkillNormalizer:
    def __init__(self, ontology: SkillOntology) -> None:
        self.ontology = ontology

    def normalize(self, value: str) -> str:
        return self.ontology.normalize(value)

    def key(self, value: str) -> str:
        return self.ontology.normalize_key(value)

    def clean(self, value: str) -> str:
        return self.ontology.clean_surface(value)

    def evidence_contains(self, evidence: str, value: str) -> bool:
        evidence_key = self.key(evidence)
        value_key = self.key(value)
        if not value_key:
            return False

        start = 0
        while True:
            index = evidence_key.find(value_key, start)
            if index < 0:
                return False
            before = evidence_key[index - 1] if index > 0 else " "
            after_index = index + len(value_key)
            after = evidence_key[after_index] if after_index < len(evidence_key) else " "
            if not before.isalnum() and before not in {"+", "#", "."} and not after.isalnum() and after not in {"+", "#", "."}:
                return True
            start = index + 1
