from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.services.identity_extraction.extractor import IdentityExtractor
from app.services.identity_extraction.llm_verifier import LLMIdentityVerifier


class ResumeIdentityPipeline:
    def __init__(self) -> None:
        self.extractor = IdentityExtractor()
        self.llm_verifier = LLMIdentityVerifier()

    def analyze(self, text: str, db: Session | None = None, recruiter_id: int | None = None) -> dict[str, Any]:
        identity = self.extractor.extract(text).to_dict()
        identity = self._apply_llm_review(text, identity, db=db, recruiter_id=recruiter_id)
        return identity

    def _apply_llm_review(self, text: str, identity: dict[str, Any],
                           db: Session | None = None, recruiter_id: int | None = None) -> dict[str, Any]:
        review = self.llm_verifier.review_resume_identity(text, identity, db=db, recruiter_id=recruiter_id)
        stats = dict(identity.get("stats", {}))
        stats["llm_review"] = {
            "available": review.available,
            "provider": review.provider,
            "reason": review.reason,
            "rejected_count": len(review.rejected),
        }
        identity["stats"] = stats

        if not review.available or not review.identity:
            return identity

        reviewed = review.identity
        return {
            "name": self._merge_name(identity.get("name", {}), reviewed.get("name", {})),
            "email": self._merge_field(identity.get("email", {}), reviewed.get("email", {})),
            "phone": self._merge_field(identity.get("phone", {}), reviewed.get("phone", {})),
            "stats": stats,
        }

    @staticmethod
    def _merge_name(original: object, reviewed: object) -> dict[str, Any]:
        original_name = original if isinstance(original, dict) else {}
        reviewed_name = reviewed if isinstance(reviewed, dict) else {}
        full_name = str(reviewed_name.get("full_name", "")).strip()
        if not full_name:
            return original_name
        return {
            "full_name": full_name,
            "confidence": float(reviewed_name.get("confidence", 0.0) or 0.0),
            "score": int(reviewed_name.get("score", 0) or original_name.get("score", 0) or 0),
            "candidates": original_name.get("candidates", []),
        }

    @staticmethod
    def _merge_field(original: object, reviewed: object) -> dict[str, Any]:
        reviewed_field = reviewed if isinstance(reviewed, dict) else {}
        value = str(reviewed_field.get("value", "")).strip()
        if not value:
            return original if isinstance(original, dict) else {"value": "", "confidence": 0.0, "evidence": []}
        evidence = reviewed_field.get("evidence", [])
        if not isinstance(evidence, list):
            evidence = [str(evidence)] if evidence else []
        return {
            "value": value,
            "confidence": float(reviewed_field.get("confidence", 0.0) or 0.0),
            "evidence": [str(item) for item in evidence if str(item).strip()],
        }


ResumeIdentityExtractionPipeline = ResumeIdentityPipeline
ResumeIdentityExtractor = ResumeIdentityPipeline
