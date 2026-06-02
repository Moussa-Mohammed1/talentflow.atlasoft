from __future__ import annotations

import re
from functools import lru_cache
from typing import Iterable

import spacy

from app.services.skill_extraction.constants import ACTION_VERB_TO_COMPETENCY, HEADER_TERMS, SECTION_CONFIDENCE
from app.services.skill_extraction.models import CandidateRecord, SectionSpan
from app.services.skill_extraction.ontology import SkillOntology


class CandidateExtractor:
    def __init__(self, ontology: SkillOntology) -> None:
        self.ontology = ontology
        self._nlp = self._load_spacy_model()
        self._regex_patterns = [
            re.compile(r"\b[A-Z]{2,}(?:[./#-][A-Z0-9]+)+\b"),
            re.compile(r"\b[A-Z][a-z]+(?:\.[A-Za-z0-9]+)?\b"),
            re.compile(r"\b[A-Za-z]+(?:[.-][A-Za-z0-9]+)+\b"),
            re.compile(r"\b(?:[A-Z]{2,}|[A-Z][a-z]+(?:\s+[A-Z][a-z0-9]+)+)\b"),
        ]
        self._action_verb_set = set(ACTION_VERB_TO_COMPETENCY)

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_spacy_model():
        try:
            return spacy.load("fr_core_news_sm")
        except Exception:
            nlp = spacy.blank("fr")
            if "sentencizer" not in nlp.pipe_names:
                nlp.add_pipe("sentencizer")
            return nlp

    _UNKNOWN_SECTION = SectionSpan("unknown", "", 1, 1, 0, 0, 0.3)

    TECH_HINTS = {
        "system", "software", "database", "api", "server", "network",
        "platform", "tool", "infrastructure", "framework", "library",
        "cloud", "devops", "backend", "frontend", "stack", "protocol",
        "deployment", "container", "pipeline", "microservice", "architecture",
    }

    @staticmethod
    def _section_for_char(char_index: int, sections: list[SectionSpan]) -> SectionSpan:
        if not sections:
            return CandidateExtractor._UNKNOWN_SECTION
        for section in sections:
            if section.start_char <= char_index <= section.end_char:
                return section
        return sections[0]

    @staticmethod
    def _contains_alpha(value: str) -> bool:
        return any(character.isalpha() for character in value)

    @staticmethod
    def _looks_like_header(value: str) -> bool:
        normalized = SkillOntology.normalize_key(value)
        return normalized in HEADER_TERMS or normalized.replace(" ", "") in {term.replace(" ", "") for term in HEADER_TERMS}

    @staticmethod
    def _singularize_phrase(value: str) -> str:
        words = value.split()
        singularized: list[str] = []
        for word in words:
            if word.isupper() and len(word) <= 4:
                singularized.append(word)
                continue
            if word.endswith("ies") and len(word) > 4:
                singularized.append(word[:-3] + "y")
            elif word.endswith("s") and len(word) > 3 and not word.endswith(("ss", "us", "is")):
                singularized.append(word[:-1])
            else:
                singularized.append(word)
        return " ".join(singularized)

    @staticmethod
    def _phrase_score(source: str) -> float:
        return {
            "ontology": 0.98,
            "context": 0.8,
            "phrase": 0.7,
            "ner": 0.58,
            "regex": 0.55,
        }.get(source, 0.5)

    def _add_candidate(
        self,
        candidates: dict[str, CandidateRecord],
        candidate: str,
        source: str,
        section: SectionSpan,
        evidence: str | None = None,
        char_start: int | None = None,
    ) -> None:
        cleaned = self.ontology.clean_surface(candidate)
        if not cleaned or len(cleaned) < 2 or not self._contains_alpha(cleaned):
            return
        if self._looks_like_header(cleaned):
            return
        if cleaned.isdigit():
            return

        key = self.ontology.normalize_key(cleaned)
        if not key:
            return

        record = candidates.get(key)
        if record is None:
            record = CandidateRecord(
                original=cleaned,
                section=section.name,
                section_score=SECTION_CONFIDENCE.get(section.name, 0.55),
            )
            candidates[key] = record

        record.add(source, self._phrase_score(source), evidence)
        if char_start is not None and section.name == "profile":
            record.section = section.name

    def _extract_regex_candidates(self, text: str) -> Iterable[str]:
        for pattern in self._regex_patterns:
            for match in pattern.finditer(text):
                candidate = match.group(0).strip()
                if not candidate:
                    continue
                # Reject very short candidates (2 chars or less)
                if len(candidate) <= 2:
                    continue
                # Reject titlecase-only alphabetic words not in ontology
                if candidate.isalpha() and candidate.istitle() and self.ontology.resolve_concept(candidate) is None:
                    continue
                yield candidate

    @staticmethod
    def _is_structured_line(line: str) -> bool:
        """Check if a line looks like a structured skill listing (bullet, comma-separated, etc.)."""
        stripped = line.strip()
        # Bullet list patterns
        if stripped and stripped[0] in {'-', '•', '▪', '►', '●', '○', '★', '✓', '*'}:
            return True
        # Numbered list
        if re.match(r'^\d+[.)\-]\s', stripped):
            return True
        # Comma/pipe/semicolon separated lists (3+ items)
        for delimiter in (',', '|', ';'):
            if stripped.count(delimiter) >= 2:
                return True
        return False

    def _extract_context_candidate(self, sentence, sentence_text: str) -> list[str]:
        # Context extraction is heavily constrained:
        # 1. Must have an action verb
        # 2. Sentence must contain a TECH_HINT
        # 3. Noun phrase must contain a TECH_HINT
        # 4. Sentence should be in structured formatting
        tokens = [token.lemma_.casefold() for token in sentence if token.is_alpha]
        matched_verb = next((token for token in tokens if token in self._action_verb_set), None)
        if matched_verb is None:
            return []

        # Check if sentence contains at least one tech hint
        sentence_lower = sentence_text.casefold()
        has_sentence_tech = any(hint in sentence_lower for hint in self.TECH_HINTS)
        if not has_sentence_tech:
            return []

        # Check if sentence is in structured formatting
        is_structured = self._is_structured_line(sentence_text)

        noun_phrases = [chunk.text for chunk in sentence.noun_chunks if self._contains_alpha(chunk.text)] if sentence.has_annotation("DEP") else []
        if not noun_phrases:
            return []

        competency_suffix = ACTION_VERB_TO_COMPETENCY.get(matched_verb, "Competency")
        extracted: list[str] = []
        for noun_phrase in noun_phrases[:3]:
            normalized_noun = self._singularize_phrase(self.ontology.clean_surface(noun_phrase))
            if len(normalized_noun.split()) == 1 and normalized_noun.casefold() in {"it", "they", "we", "i"}:
                continue
            # Noun phrase must contain a tech hint
            noun_lower = normalized_noun.casefold()
            has_noun_tech = any(hint in noun_lower for hint in self.TECH_HINTS)
            if not has_noun_tech and not is_structured:
                continue
            if normalized_noun:
                extracted.append(f"{normalized_noun} {competency_suffix}".strip())
        return extracted

    def _extract_candidates(self, text: str, sections: list[SectionSpan]) -> dict[str, CandidateRecord]:
        candidates: dict[str, CandidateRecord] = {}
        doc = self._nlp(text)

        for ent in getattr(doc, "ents", []):
            candidate = ent.text.strip()
            if not candidate:
                continue
            if ent.label_ in {"PER", "LOC", "GPE", "FAC", "DATE", "TIME", "CARDINAL", "ORDINAL"}:
                continue
            section = self._section_for_char(ent.start_char, sections)
            self._add_candidate(candidates, candidate, "ner", section, ent.sent.text if ent.sent is not None else None, ent.start_char)

        if doc.has_annotation("DEP"):
            for chunk in doc.noun_chunks:
                candidate = self.ontology.clean_surface(chunk.text)
                if not candidate or len(candidate) < 2:
                    continue
                section = self._section_for_char(chunk.start_char, sections)
                self._add_candidate(candidates, candidate, "phrase", section, chunk.sent.text if chunk.sent is not None else None, chunk.start_char)

        if doc.has_annotation("SENT_START"):
            for sent in doc.sents:
                section = self._section_for_char(sent.start_char, sections)
                contextual_candidates = self._extract_context_candidate(sent, sent.text)
                for candidate in contextual_candidates:
                    self._add_candidate(candidates, candidate, "context", section, sent.text, sent.start_char)

        for candidate in self._extract_regex_candidates(text):
            section = sections[0] if sections else self._UNKNOWN_SECTION
            self._add_candidate(candidates, candidate, "regex", section, candidate)

        normalized_text = self.ontology.normalize_key(text)
        for alias, concept in self.ontology.alias_to_concept.items():
            if alias and re.search(rf"(?<!\w){re.escape(alias)}(?!\w)", normalized_text):
                section = sections[0] if sections else self._UNKNOWN_SECTION
                self._add_candidate(candidates, concept.canonical, "ontology", section, concept.canonical)

        return candidates

    def extract(self, text: str, sections: list[SectionSpan]) -> dict[str, CandidateRecord]:
        return self._extract_candidates(text, sections)
