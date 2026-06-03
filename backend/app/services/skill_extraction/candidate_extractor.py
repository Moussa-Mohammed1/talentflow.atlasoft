from __future__ import annotations

from functools import lru_cache

import spacy

from app.services.skill_extraction.constants import ACTION_VERB_TO_COMPETENCY, HEADER_TERMS, SECTION_CONFIDENCE
from app.services.skill_extraction.layout_signal_extractor import LayoutSignalExtractor
from app.services.skill_extraction.models import CandidateRecord, SectionSpan
from app.services.skill_extraction.ontology import SkillOntology


class CandidateExtractor:
    def __init__(self, ontology: SkillOntology) -> None:
        self.ontology = ontology
        self.layout = LayoutSignalExtractor(ontology)
        self._nlp = self._load_spacy_model()
        self._action_verb_set = {
            *ACTION_VERB_TO_COMPETENCY,
            "developper",
            "developpe",
            "developpement",
            "concevoir",
            "conception",
            "creer",
            "creation",
            "realiser",
            "implementation",
            "gerer",
            "gestion",
            "administrer",
            "deployer",
            "deploiement",
            "analyser",
            "analyse",
            "optimiser",
            "maintenir",
            "maintenance",
            "securiser",
            "superviser",
        }

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

    _UNKNOWN_SECTION = SectionSpan("unknown", "", 1, 1, 0, 0, 0.3)

    TECH_HINTS = {
        "api",
        "architecture",
        "backend",
        "base",
        "cloud",
        "code",
        "container",
        "database",
        "deployment",
        "devops",
        "frontend",
        "framework",
        "infrastructure",
        "library",
        "logiciel",
        "microservice",
        "network",
        "plateforme",
        "platform",
        "protocol",
        "reseau",
        "serveur",
        "server",
        "software",
        "stack",
        "system",
        "systeme",
        "tool",
        "web",
    }
    BUSINESS_HINTS = {
        "acquisition",
        "advertising",
        "business",
        "client",
        "customer",
        "editing",
        "lead",
        "leads",
        "management",
        "marketing",
        "media",
        "operations",
        "pitching",
        "process",
        "relationship",
        "relationships",
        "sales",
        "service",
        "social",
        "strategic",
    }
    COMPOUND_SKILL_ALIASES = {
        "advertising": "Advertising",
        "business development": "Business Development",
        "business growth": "Business Development",
        "client acquisition": "Client Acquisition",
        "customer service": "Customer Service",
        "editing": "Editing",
        "lead generation": "Lead Generation",
        "generate new leads": "Lead Generation",
        "new leads": "Lead Generation",
        "marketing": "Marketing",
        "marketing initiatives": "Marketing",
        "marketing management": "Marketing Management",
        "microsoft excel": "Microsoft Excel",
        "microsoft office suite": "Microsoft Office Suite",
        "microsoft outlook": "Microsoft Outlook",
        "microsoft powerpoint": "Microsoft PowerPoint",
        "microsoft word": "Microsoft Word",
        "powerpoint": "Microsoft PowerPoint",
        "process improvement": "Process Improvement",
        "relationship management": "Relationship Management",
        "maintaining relationships": "Relationship Management",
        "establishing and maintaining relationships": "Relationship Management",
        "sales cycle": "Sales Cycle Management",
        "sales management": "Sales Management",
        "sales operations": "Sales Operations",
        "sales pitching": "Sales Pitching",
        "social media": "Social Media Marketing",
        "social media marketing": "Social Media Marketing",
        "strategic marketing": "Strategic Marketing",
        "strategic sales": "Strategic Sales",
        "strategic sales and marketing": "Strategic Marketing",
        "word": "Microsoft Word",
        "excel": "Microsoft Excel",
        "outlook": "Microsoft Outlook",
    }
    SKILL_LABEL_WORDS = LayoutSignalExtractor.SKILL_LABEL_WORDS

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
    def _word_count(value: str) -> int:
        return LayoutSignalExtractor.word_count(value)

    def _looks_like_header(self, value: str) -> bool:
        return self.layout.looks_like_header(value)

    @staticmethod
    def _singularize_phrase(value: str) -> str:
        words = value.split()
        singularized: list[str] = []
        for word in words:
            if word.isupper() and len(word) <= 4:
                singularized.append(word)
                continue
            lower = word.casefold()
            if lower.endswith("ies") and len(word) > 4:
                singularized.append(word[:-3] + "y")
            elif lower.endswith("s") and len(word) > 3 and not lower.endswith(("ss", "us", "is")):
                singularized.append(word[:-1])
            else:
                singularized.append(word)
        return " ".join(singularized)

    @staticmethod
    def _phrase_score(source: str) -> float:
        return {
            "layout": 0.86,
            "context": 0.78,
            "business_context": 0.76,
            "phrase": 0.68,
            "ner": 0.58,
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
        if self._looks_like_header(cleaned) or cleaned.isdigit():
            return
        key_preview = self.ontology.normalize_key(cleaned)
        if self.layout.looks_like_metadata_value(cleaned):
            return
        if self.layout.looks_like_language_level(cleaned):
            return
        if key_preview in HEADER_TERMS:
            return
        if self._word_count(cleaned) > 7:
            return

        key = key_preview
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
        if char_start is not None and section.name != "unknown":
            record.section = section.name

    @classmethod
    def _is_structured_line(cls, line: str) -> bool:
        return LayoutSignalExtractor.is_structured_line(line)

    @classmethod
    def _split_skill_line(cls, line: str) -> list[str]:
        return LayoutSignalExtractor.split_skill_line(line)

    def _has_skill_surface(self, value: str, *, list_item: bool = False) -> bool:
        return self.layout.has_skill_surface(value, list_item=list_item)

    @staticmethod
    def _line_start_positions(text: str) -> list[tuple[int, str]]:
        return LayoutSignalExtractor.line_start_positions(text)

    def _extract_layout_candidates(self, text: str, sections: list[SectionSpan], candidates: dict[str, CandidateRecord]) -> None:
        for start_char, line in self._line_start_positions(text):
            stripped = line.strip()
            if not stripped:
                continue

            section = self._section_for_char(start_char, sections)
            is_structured = self._is_structured_line(stripped)
            has_skill_label = self.layout.has_skill_label(stripped)
            is_skill_section = section.name == "technical_skills"
            is_context_section = section.name in {"projects", "experience", "certifications"}

            if is_context_section and not has_skill_label:
                continue
            if not is_structured and not is_skill_section:
                continue

            comma_fragments = self._split_skill_line(stripped) if "," in stripped else []
            should_split_concise_skill_line = (
                is_skill_section
                and len(comma_fragments) >= 2
                and len(comma_fragments) <= 6
                and any(self.layout.has_strong_skill_surface(fragment) for fragment in comma_fragments)
            )
            fragments = self._split_skill_line(stripped) if is_structured or has_skill_label or should_split_concise_skill_line else [stripped]
            list_like = len(fragments) >= 2
            for fragment in fragments:
                cleaned = self.ontology.clean_surface(fragment)
                if not cleaned:
                    continue
                if is_context_section and not has_skill_label:
                    continue
                if not is_structured and self._word_count(cleaned) > 4:
                    continue
                if not has_skill_label and not self._has_skill_surface(cleaned, list_item=list_like):
                    continue
                self._add_candidate(candidates, cleaned, "layout", section, stripped, start_char)

    def _extract_context_candidate(self, sentence, sentence_text: str) -> list[str]:
        tokens = [SkillOntology.strip_accents(token.lemma_ or token.text).casefold() for token in sentence if token.is_alpha]
        matched_verb = next((token for token in tokens if token in self._action_verb_set), None)
        if matched_verb is None:
            return []

        sentence_lower = SkillOntology.strip_accents(sentence_text).casefold()
        has_sentence_tech = any(hint in sentence_lower for hint in self.TECH_HINTS)
        if not has_sentence_tech:
            return []

        noun_phrases = [chunk.text for chunk in sentence.noun_chunks if self._contains_alpha(chunk.text)] if sentence.doc.has_annotation("DEP") else []
        extracted: list[str] = []
        for noun_phrase in noun_phrases[:4]:
            normalized_noun = self._singularize_phrase(self.ontology.clean_surface(noun_phrase))
            if len(normalized_noun.split()) == 1 and normalized_noun.casefold() in {"it", "they", "we", "i", "il", "elle", "nous"}:
                continue
            noun_lower = SkillOntology.strip_accents(normalized_noun).casefold()
            if any(hint in noun_lower for hint in self.TECH_HINTS):
                extracted.append(normalized_noun)
        return extracted

    def _extract_business_candidates(self, text: str, sections: list[SectionSpan], candidates: dict[str, CandidateRecord]) -> None:
        normalized_text = self.ontology.normalize_key(text)
        for alias, canonical in self.COMPOUND_SKILL_ALIASES.items():
            if not self._contains_normalized_phrase(normalized_text, alias):
                continue
            evidence = self._line_for_phrase(text, alias) or canonical
            section = self._section_for_char(text.find(evidence) if evidence in text else 0, sections)
            self._add_candidate(candidates, canonical, "business_context", section, evidence)

        for start_char, line in self._line_start_positions(text):
            stripped = line.strip()
            if not stripped or ":" not in stripped:
                continue
            label, rest = stripped.split(":", 1)
            label_key = self.ontology.normalize_key(label)
            if label_key and any(hint in label_key.split() for hint in self.BUSINESS_HINTS):
                section = self._section_for_char(start_char, sections)
                self._add_candidate(candidates, label, "business_context", section, stripped, start_char)
            rest_key = self.ontology.normalize_key(rest)
            if "microsoft office suite" in rest_key:
                section = self._section_for_char(start_char, sections)
                self._add_candidate(candidates, "Microsoft Office Suite", "business_context", section, stripped, start_char)

    @staticmethod
    def _contains_normalized_phrase(normalized_text: str, phrase: str) -> bool:
        start = 0
        while True:
            index = normalized_text.find(phrase, start)
            if index < 0:
                return False
            before = normalized_text[index - 1] if index > 0 else " "
            after_index = index + len(phrase)
            after = normalized_text[after_index] if after_index < len(normalized_text) else " "
            if not before.isalnum() and not after.isalnum():
                return True
            start = index + 1

    def _line_for_phrase(self, text: str, phrase: str) -> str | None:
        phrase_key = self.ontology.normalize_key(phrase)
        for line in text.splitlines():
            if self._contains_normalized_phrase(self.ontology.normalize_key(line), phrase_key):
                return line.strip()
        return None

    def _extract_candidates(self, text: str, sections: list[SectionSpan]) -> dict[str, CandidateRecord]:
        candidates: dict[str, CandidateRecord] = {}
        doc = self._nlp(text)

        self._extract_layout_candidates(text, sections, candidates)
        self._extract_business_candidates(text, sections, candidates)

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
                if section.name != "technical_skills":
                    continue
                self._add_candidate(candidates, candidate, "phrase", section, chunk.sent.text if chunk.sent is not None else None, chunk.start_char)

        if doc.has_annotation("SENT_START"):
            for sent in doc.sents:
                section = self._section_for_char(sent.start_char, sections)
                for candidate in self._extract_context_candidate(sent, sent.text):
                    self._add_candidate(candidates, candidate, "context", section, sent.text, sent.start_char)

        return candidates

    def extract(self, text: str, sections: list[SectionSpan]) -> dict[str, CandidateRecord]:
        return self._extract_candidates(text, sections)
