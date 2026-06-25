from __future__ import annotations

from typing import Any

from app.services.language_extraction.extractor import LanguageExtractor
from app.services.language_extraction.llm_verifier import LLMLanguageVerifier
from app.services.language_extraction.models import LanguageExtractionResult, LanguageMention, LanguageProficiency
from app.services.skill_extraction.section_analyzer import ResumeSectionAnalyzer


class ResumeLanguageExtractionPipeline:
    def __init__(self) -> None:
        self.section_analyzer = ResumeSectionAnalyzer()
        self.extractor = LanguageExtractor()
        self.llm_verifier = LLMLanguageVerifier()

    @staticmethod
    def _merge(
        existing: dict[str, LanguageMention],
        lang: LanguageMention,
    ) -> None:
        key = lang.language.casefold()
        prev = existing.get(key)
        if prev is None or lang.confidence > prev.confidence:
            existing[key] = lang

    def analyze(self, text: str) -> LanguageExtractionResult:
        if not text or not text.strip():
            empty_stats = {"language_count": 0, "llm_available": False}
            return LanguageExtractionResult(
                raw_text=text or "",
                sections=[],
                languages=[],
                stats=empty_stats,
            )

        sections = self.section_analyzer.analyze(text)
        deterministic = self.extractor.extract(text)
        llm_review = self.llm_verifier.review(text, deterministic)

        merged: dict[str, LanguageMention] = {}

        for lang in deterministic:
            self._merge(merged, lang)

        if llm_review.available and llm_review.languages:
            rejected_names = {
                str(item.get("language", "")).casefold().strip()
                for item in llm_review.rejected
                if isinstance(item, dict)
            }

            for item in llm_review.languages:
                if not isinstance(item, dict):
                    continue
                lang_name = str(item.get("language", "")).strip()
                if not lang_name:
                    continue
                key = lang_name.casefold()
                if key in rejected_names:
                    merged.pop(key, None)
                    continue

                proficiency = None
                prof_raw = item.get("proficiency")
                if prof_raw and str(prof_raw).strip().casefold() != "null":
                    proficiency = LanguageProficiency(
                        level=str(prof_raw).strip(),
                        confidence=float(item.get("confidence", 0.0) or 0.0),
                    )

                mention = LanguageMention(
                    language=lang_name,
                    proficiency=proficiency,
                    confidence=float(item.get("confidence", 0.0) or 0.0),
                    section="llm_review",
                    sources=["llm"],
                    evidence=[str(e) for e in item.get("evidence", []) if str(e).strip()],
                )
                self._merge(merged, mention)

        languages = sorted(merged.values(), key=lambda l: (-l.confidence, l.language.casefold()))

        stats = {
            "language_count": len(languages),
            "llm_verification": {
                "available": llm_review.available,
                "provider": llm_review.provider,
                "reason": llm_review.reason,
                "accepted_count": len(llm_review.languages),
                "rejected_count": len(llm_review.rejected),
            },
        }

        section_dicts = []
        for section in sections:
            section_dicts.append({
                "name": section.name,
                "heading": section.heading,
                "start_line": section.start_line,
                "end_line": section.end_line,
                "confidence": section.confidence,
            })

        return LanguageExtractionResult(
            raw_text=text,
            sections=section_dicts,
            languages=languages,
            stats=stats,
        )

    def extract_languages(self, text: str) -> dict[str, Any]:
        return self.analyze(text).to_dict()


ResumeLanguageExtractionPipelineAlias = ResumeLanguageExtractionPipeline
