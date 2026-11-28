from __future__ import annotations

import re

from app.schemas.rag import (
    GroundedClaimCitation,
    GroundedContextBundle,
    GroundingCheckResult,
)

_YEARS_CLAIM_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|ans?)\s+(?:of\s+)?(?:experience|d'expérience|d'experience)",
    re.IGNORECASE,
)

_NEGATIVE_CONTEXT_HINTS = (
    "missing",
    "lack",
    "lacks",
    "no ",
    "without",
    "not ",
    "gap",
    "absent",
    "manque",
    "sans ",
    "aucun",
    "pas de ",
    "ne maîtrise pas",
    "unverified",
)


class GroundingVerifier:
    """Verifies that generated claims and citations are grounded in retrieved evidence."""

    @classmethod
    def verify(
        cls,
        bundle: GroundedContextBundle,
        *,
        claims: list[dict] | None = None,
        generated_text: str = "",
        require_citations: bool = True,
    ) -> GroundingCheckResult:
        valid_ids = set(bundle.evidence_ids)
        invalid_evidence_ids: list[str] = []
        unsupported_claims: list[str] = []
        citations: list[GroundedClaimCitation] = []

        for raw in claims or []:
            claim_text = str(raw.get("claim") or "").strip()
            raw_ids = [str(eid).strip() for eid in (raw.get("evidence_ids") or []) if str(eid).strip()]
            if not claim_text:
                continue
            bad_ids = [eid for eid in raw_ids if eid not in valid_ids]
            for eid in bad_ids:
                if eid not in invalid_evidence_ids:
                    invalid_evidence_ids.append(eid)

            if not raw_ids:
                supported = False
                note = "Missing supporting evidence_ids"
                unsupported_claims.append(f"Uncited claim: {claim_text}")
            elif bad_ids:
                supported = False
                note = f"Unknown evidence_ids: {', '.join(bad_ids)}"
                unsupported_claims.append(f"Invalid citation {bad_ids} for: {claim_text}")
            else:
                supported = True
                note = None

            citations.append(
                GroundedClaimCitation(
                    claim=claim_text,
                    evidence_ids=raw_ids,
                    supported=supported,
                    note=note,
                )
            )

        if require_citations and not citations and generated_text.strip():
            unsupported_claims.append("Response provided no evidence citations.")

        # Check for contradicted missing skills in generated text
        missing_skills: list[str] = []
        if bundle.match_signals and bundle.match_signals.missing_skills:
            missing_skills = list(bundle.match_signals.missing_skills)

        if missing_skills and generated_text.strip():
            sentences = re.split(r"(?<=[.!?\n])\s+", generated_text)
            cand_skill_set = {s.casefold() for s in bundle.candidate_skills}
            evidence_blob = " ".join(e.excerpt.casefold() for e in bundle.evidence if e.source_type != "job_offer" and e.source_type != "department_requirement" and e.source_type != "match_signal")

            for missing in missing_skills:
                if missing.casefold() in cand_skill_set or missing.casefold() in evidence_blob:
                    continue
                skill_pattern = re.compile(rf"(?<!\w){re.escape(missing)}(?!\w)", re.IGNORECASE)
                for sentence in sentences:
                    if not skill_pattern.search(sentence):
                        continue
                    lowered = sentence.casefold()
                    if any(hint in lowered for hint in _NEGATIVE_CONTEXT_HINTS):
                        continue
                    if any(
                        aff in lowered
                        for aff in (
                            "has ",
                            "possesses",
                            "proficient",
                            "experienced in",
                            "skilled in",
                            "strong ",
                            "expertise in",
                            "maîtrise",
                            "compétence",
                            "background in",
                            "brings ",
                            "proven ",
                        )
                    ):
                        unsupported_claims.append(
                            f"Unsupported skill claim: '{missing}' attributed to candidate despite being missing."
                        )
                        break

        # Check for inflated years-of-experience claims
        if generated_text.strip():
            for match in _YEARS_CLAIM_PATTERN.finditer(generated_text):
                claimed_years = float(match.group(1))
                max_allowed = max(bundle.candidate_experience_years + 1.5, 1.5)
                if bundle.job_required_experience_years is not None and abs(claimed_years - bundle.job_required_experience_years) < 0.1:
                    # Mentions the job's required years rather than the candidate's
                    snippet = generated_text[max(0, match.start() - 40) : match.end() + 20].casefold()
                    if any(w in snippet for w in ("require", "requis", "minimum", "target", "job")):
                        continue
                if claimed_years > max_allowed:
                    unsupported_claims.append(
                        f"Unsupported experience duration claim: {claimed_years:.1f} years exceeds retrieved {bundle.candidate_experience_years:.1f} years."
                    )

        # Compute score
        penalty = 0.0
        penalty += 0.25 * len(invalid_evidence_ids)
        penalty += 0.25 * len(unsupported_claims)
        if citations:
            uncited_ratio = sum(1 for c in citations if not c.supported) / len(citations)
            penalty += 0.3 * uncited_ratio

        grounding_score = round(max(0.0, min(1.0, 1.0 - penalty)), 4)
        passed = grounding_score >= 0.7 and not invalid_evidence_ids and not unsupported_claims

        return GroundingCheckResult(
            grounding_score=grounding_score,
            passed=passed,
            citations=citations,
            invalid_evidence_ids=invalid_evidence_ids,
            unsupported_claims=unsupported_claims,
        )
