from __future__ import annotations

import re
from datetime import datetime

from sqlalchemy.orm import Session

from app.services.certification_extraction.extractor import CertificationBlockExtractor
from app.services.certification_extraction.llm_verifier import LLMCertificationVerifier
from app.services.certification_extraction.models import CertificationExtractionResult, CertificationMention
from app.services.skill_extraction.section_analyzer import ResumeSectionAnalyzer


class ResumeCertificationExtractionPipeline:
    def __init__(self, db: Session | None = None, recruiter_id: int | None = None) -> None:
        self.section_analyzer = ResumeSectionAnalyzer()
        self.extractor = CertificationBlockExtractor()
        self.llm_verifier = LLMCertificationVerifier()
        self._db = db
        self._recruiter_id = recruiter_id

    @staticmethod
    def _key(mention: CertificationMention) -> tuple[str, object, object]:
        name = re.sub(r"\W+", " ", mention.name.casefold()).strip()
        return name, mention.issue_date, mention.organization

    def analyze(self, text: str) -> CertificationExtractionResult:
        if not text or not text.strip():
            return CertificationExtractionResult(
                raw_text=text or "",
                sections=[],
                certifications=[],
                stats={"candidate_count": 0, "certification_count": 0, "rejected_count": 0},
            )

        sections = self.section_analyzer.analyze(text)
        candidates, rejected = self.extractor.extract(text, sections)
        deterministic_candidate_count = len(candidates)
        llm_review = self.llm_verifier.review(text, candidates, db=self._db, recruiter_id=self._recruiter_id)
        candidates = llm_review.certifications

        deduped: dict[tuple[str, object, object], CertificationMention] = {}
        for candidate in candidates:
            key = self._key(candidate)
            existing = deduped.get(key)
            if existing is None or candidate.confidence > existing.confidence:
                deduped[key] = candidate

        certifications = sorted(
            deduped.values(),
            key=lambda item: (
                item.issue_date is None,
                item.issue_date or datetime.min,
            ),
            reverse=True,
        )

        return CertificationExtractionResult(
            raw_text=text,
            sections=sections,
            certifications=certifications,
            stats={
                "candidate_count": deterministic_candidate_count + rejected,
                "certification_count": len(certifications),
                "rejected_count": rejected,
                "llm_verification": {
                    "available": llm_review.available,
                    "provider": llm_review.provider,
                    "accepted_count": llm_review.accepted_count,
                    "corrected_count": llm_review.corrected_count,
                    "added_count": llm_review.added_count,
                    "rejected_count": llm_review.rejected_count,
                    "reason": llm_review.reason,
                },
                "dynamic_extraction": True,
                "languages": ["en", "fr"],
                "architecture": [
                    "section_detection",
                    "certification_block_detection",
                    "field_extraction",
                    "date_normalization",
                    "validation_scoring",
                    "llm_verification",
                    "deduplication",
                ],
            },
        )


class PretrainedBilingualCertificationExtractor:
    def __init__(self, db: Session | None = None, recruiter_id: int | None = None) -> None:
        self.pipeline = ResumeCertificationExtractionPipeline(db=db, recruiter_id=recruiter_id)

    def extract_certifications(self, text: str) -> dict[str, object]:
        return self.pipeline.analyze(text).to_dict()
