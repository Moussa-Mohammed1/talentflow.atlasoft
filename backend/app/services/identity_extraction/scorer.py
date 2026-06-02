from __future__ import annotations

from app.services.identity_extraction.models import CandidateScore


class IdentityScorer:
    @staticmethod
    def _best_candidate(candidates: list[CandidateScore]) -> CandidateScore:
        if not candidates:
            return CandidateScore(value="", confidence=0.0, evidence=[])
        ranked = sorted(candidates, key=lambda item: (-item.confidence, item.value.casefold()))
        best = ranked[0]
        merged_evidence = []
        seen = set()
        for candidate in ranked[:3]:
            for evidence in candidate.evidence:
                if evidence not in seen:
                    merged_evidence.append(evidence)
                    seen.add(evidence)
        return CandidateScore(value=best.value, confidence=best.confidence, evidence=merged_evidence, signals=best.signals)
