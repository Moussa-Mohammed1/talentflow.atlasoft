from __future__ import annotations

import re
from datetime import datetime

from app.services.education_extraction.extractor import EducationBlockExtractor
from app.services.education_extraction.llm_verifier import LLMEducationVerifier
from app.services.education_extraction.models import EducationExtractionResult, EducationMention
from app.services.skill_extraction.section_analyzer import ResumeSectionAnalyzer


class ResumeEducationExtractionPipeline:
    def __init__(self) -> None:
        self.section_analyzer = ResumeSectionAnalyzer()
        self.extractor = EducationBlockExtractor()
        self.llm_verifier = LLMEducationVerifier()

    @staticmethod
    def _key(mention: EducationMention) -> tuple[str, object, object]:
        institution = re.sub(r"\W+", " ", mention.institution.casefold()).strip()
        return institution, mention.start_date, mention.end_date

    def analyze(self, file_path: str, text: str) -> EducationExtractionResult:
        if not text or not text.strip():
            return EducationExtractionResult(
                raw_text=text or "",
                sections=[],
                educations=[],
                stats={"candidate_count": 0, "education_count": 0, "rejected_count": 0},
            )

        sections = self.section_analyzer.analyze(text)
        candidates, rejected = self.extractor.extract(text, sections)
        deterministic_candidate_count = len(candidates)
        llm_review = self.llm_verifier.review(file_path, text, candidates)
        candidates = llm_review.educations

        deduped: dict[tuple[str, object, object], EducationMention] = {}
        for candidate in candidates:
            key = self._key(candidate)
            existing = deduped.get(key)
            if existing is None or candidate.confidence > existing.confidence:
                deduped[key] = candidate

        educations = sorted(
            deduped.values(),
            key=lambda item: (
                item.end_date is None,
                item.end_date if item.end_date is not None else item.start_date or datetime.min,
                item.start_date or datetime.min,
            ),
            reverse=True,
        )

        return EducationExtractionResult(
            raw_text=text,
            sections=sections,
            educations=educations,
            stats={
                "candidate_count": deterministic_candidate_count + rejected,
                "education_count": len(educations),
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


class PretrainedBilingualEducationExtractor:
    def __init__(self) -> None:
        self.pipeline = ResumeEducationExtractionPipeline()

    def extract_education(self, file_path: str, text: str) -> dict[str, object]:
        return self.pipeline.analyze(file_path, text).to_dict()
