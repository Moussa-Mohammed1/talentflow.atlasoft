from __future__ import annotations

from functools import lru_cache

import spacy

from app.services.language_extraction.constants import (
    KNOWN_LANGUAGES,
    PROFICIENCY_PATTERNS,
    LANGUAGE_SECTION_SCORE,
    LANGUAGE_PROFILE_SCORE,
    LANGUAGE_OTHER_SECTION_SCORE,
)
from app.services.language_extraction.models import LanguageMention, LanguageProficiency
from app.services.skill_extraction.section_analyzer import ResumeSectionAnalyzer


class LanguageExtractor:
    def __init__(self) -> None:
        self.section_analyzer = ResumeSectionAnalyzer()
        self._nlp = self._load_spacy_model()
        self._lang_map = {key.casefold(): val for key, val in KNOWN_LANGUAGES.items()}

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_spacy_model():
        for model_name in ("fr_core_news_sm", "en_core_web_sm", "xx_ent_wiki_sm"):
            try:
                return spacy.load(model_name)
            except Exception:
                continue
        nlp = spacy.blank("xx")
        if "sentencizer" not in nlp.pipe_names:
            nlp.add_pipe("sentencizer")
        return nlp

    @staticmethod
    def _line_start_positions(text: str) -> list[tuple[int, str]]:
        positions: list[tuple[int, str]] = []
        cursor = 0
        for line in text.splitlines():
            positions.append((cursor, line))
            cursor += len(line) + 1
        return positions

    def _detect_proficiency(self, line: str) -> LanguageProficiency | None:
        matched = None
        for pattern, level, confidence in PROFICIENCY_PATTERNS:
            m = pattern.search(line)
            if m is not None and (matched is None or confidence > matched[2]):
                matched = (m.group(), level, confidence, m.start(), m.end())
        if matched is None:
            return None
        return LanguageProficiency(level=matched[1], confidence=matched[2], evidence=[line.strip()])

    def _extract_languages_from_section(self, text: str, section_name: str) -> list[LanguageMention]:
        found: dict[str, LanguageMention] = {}
        base_confidence = LANGUAGE_SECTION_SCORE if section_name == "languages" else LANGUAGE_OTHER_SECTION_SCORE

        for start_char, line in self._line_start_positions(text):
            stripped = line.strip()
            if not stripped:
                continue
            lowered = stripped.casefold()

            detected_langs = []
            for key, canonical in self._lang_map.items():
                if key in lowered:
                    detected_langs.append(canonical)

            if not detected_langs:
                continue

            proficiency = self._detect_proficiency(stripped)
            for lang in detected_langs:
                existing = found.get(lang)
                lang_confidence = base_confidence
                lang_confidence = min(1.0, lang_confidence + 0.1)
                evidence = [stripped]
                sources = ["layout"]
                if proficiency is not None and existing is not None and existing.proficiency is not None:
                    if proficiency.confidence > existing.proficiency.confidence:
                        found[lang] = LanguageMention(
                            language=lang,
                            proficiency=proficiency,
                            confidence=lang_confidence,
                            section=section_name,
                            sources=sources,
                            evidence=evidence,
                        )
                elif existing is None:
                    found[lang] = LanguageMention(
                        language=lang,
                        proficiency=proficiency,
                        confidence=lang_confidence,
                        section=section_name,
                        sources=sources,
                        evidence=evidence,
                    )

        return list(found.values())

    def _extract_languages_from_profile(self, text: str) -> list[LanguageMention]:
        doc = self._nlp(text)
        found: dict[str, LanguageMention] = {}

        for ent in getattr(doc, "ents", []):
            lowered = ent.text.strip().casefold()
            if ent.label_ in {"PER", "LOC", "GPE", "FAC", "DATE", "TIME", "CARDINAL", "ORDINAL"}:
                continue
            canonical = self._lang_map.get(lowered)
            if canonical is None:
                continue
            sent_text = ent.sent.text.strip() if ent.sent is not None else ent.text
            proficiency = self._detect_proficiency(sent_text)
            evidence = [sent_text]
            sources = ["ner"]
            lang_confidence = LANGUAGE_PROFILE_SCORE
            if proficiency is not None:
                lang_confidence = min(1.0, lang_confidence + 0.1)
            existing = found.get(canonical)
            if existing is None:
                found[canonical] = LanguageMention(
                    language=canonical,
                    proficiency=proficiency,
                    confidence=lang_confidence,
                    section="profile",
                    sources=sources,
                    evidence=evidence,
                )

        return list(found.values())

    def extract(self, text: str) -> list[LanguageMention]:
        if not text or not text.strip():
            return []

        sections = self.section_analyzer.analyze(text)
        all_langs: dict[str, LanguageMention] = {}

        for section in sections:
            section_text_lines = text.splitlines()[section.start_line - 1 : section.end_line]
            section_text = "\n".join(section_text_lines)
            extracted = self._extract_languages_from_section(section_text, section.name)
            for lang in extracted:
                existing = all_langs.get(lang.language)
                if existing is None or lang.confidence > existing.confidence:
                    all_langs[lang.language] = lang

        profile_langs = self._extract_languages_from_profile(text)
        for lang in profile_langs:
            existing = all_langs.get(lang.language)
            if existing is None or lang.confidence > existing.confidence:
                all_langs[lang.language] = lang

        return sorted(all_langs.values(), key=lambda l: (-l.confidence, l.language.casefold()))
