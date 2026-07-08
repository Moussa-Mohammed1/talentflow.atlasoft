from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.services.experience_extraction.extractor import ExperienceBlockExtractor
from app.services.experience_extraction.llm_verifier import LLMExperienceVerifier
from app.services.experience_extraction.models import ExperienceExtractionResult, ExperienceMention
from app.services.skill_extraction.section_analyzer import ResumeSectionAnalyzer


class ResumeExperienceExtractionPipeline:
    def __init__(self, db: Session | None = None, recruiter_id: int | None = None) -> None:
        self.section_analyzer = ResumeSectionAnalyzer()
        self.extractor = ExperienceBlockExtractor()
        self.llm_verifier = LLMExperienceVerifier()
        self._db = db
        self._recruiter_id = recruiter_id

    @staticmethod
    def _key(mention: ExperienceMention) -> tuple[str, object, object]:
        title = re.sub(r"\W+", " ", mention.title.casefold()).strip()
        return title, mention.start_date, mention.end_date

    def analyze(self, text: str) -> ExperienceExtractionResult:
        if not text or not text.strip():
            return ExperienceExtractionResult(
                raw_text=text or "",
                sections=[],
                experiences=[],
                stats={"candidate_count": 0, "experience_count": 0, "rejected_count": 0},
            )

        sections = self.section_analyzer.analyze(text)
        candidates, rejected = self.extractor.extract(text, sections)
        deterministic_candidate_count = len(candidates)
        llm_review = self.llm_verifier.review(text, candidates, db=self._db, recruiter_id=self._recruiter_id)
        candidates = llm_review.experiences
        deduped: dict[tuple[str, object, object], ExperienceMention] = {}
        for candidate in candidates:
            key = self._key(candidate)
            existing = deduped.get(key)
            if existing is None or candidate.confidence > existing.confidence:
                deduped[key] = candidate

        experiences = sorted(
            deduped.values(),
            key=lambda item: (item.end_date is None, item.end_date or item.start_date, item.start_date),
            reverse=True,
        )
        return ExperienceExtractionResult(
            raw_text=text,
            sections=sections,
            experiences=experiences,
            stats={
                "candidate_count": deterministic_candidate_count + rejected,
                "experience_count": len(experiences),
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
                    "dated_block_detection",
                    "field_extraction",
                    "date_normalization",
                    "validation_scoring",
                    "llm_verification",
                    "deduplication",
                ],
            },
        )


class PretrainedBilingualExperienceExtractor:
    def __init__(self, db: Session | None = None, recruiter_id: int | None = None) -> None:
        self.pipeline = ResumeExperienceExtractionPipeline(db=db, recruiter_id=recruiter_id)

    def extract_experiences(self, text: str) -> dict[str, object]:
        return self.pipeline.analyze(text).to_dict()
