from __future__ import annotations

from math import exp
from typing import Iterable

from app.services.skill_extraction.constants import COMPETENCY_FAMILY, TECHNOLOGY_FAMILY, SECTION_CONFIDENCE
from app.services.skill_extraction.category_classifier import SkillCategoryClassifier
from app.services.skill_extraction.embedding_matcher import EmbeddingSkillMatcher
from app.services.skill_extraction.llm_verifier import LLMSkillVerifier
from app.services.skill_extraction.models import CandidateRecord, SectionSpan, SkillMention
from app.services.skill_extraction.normalizer import SkillNormalizer
from app.services.skill_extraction.ontology import SkillOntology
from app.services.skill_extraction.ontology_matcher import OntologyMatch, OntologyMatcher
from app.services.skill_extraction.skill_taxonomy import DEFAULT_REJECT_TERMS


# ---------------------------------------------------------------------------
# Hard-negative word lists
# ---------------------------------------------------------------------------
_JOB_TITLES = {
    "developer", "engineer", "manager", "supervisor", "director", "analyst",
    "consultant", "architect", "administrator", "coordinator", "specialist",
    "officer", "technician", "intern", "trainee", "assistant", "associate",
    "executive", "president", "vp", "cto", "ceo", "cfo", "cio", "coo",
    "chief", "head", "principal", "senior", "junior", "lead",
}

_MILITARY_ROLES = {
    "captain", "colonel", "lieutenant", "sergeant", "soldier", "veteran",
    "commander", "corporal", "private", "major", "general", "admiral",
}

_GENERIC_PHRASES = {
    "results driven", "results-driven", "highly motivated", "self starter",
    "self-starter", "hard worker", "team player", "go getter", "go-getter",
    "detail oriented", "detail-oriented", "fast learner", "quick learner",
    "proactive", "passionate", "dedicated", "motivated",
}

# Single common words that are NOT skills unless explicitly in a tech section
_AMBIGUOUS_SINGLE_WORDS = {
    "go", "lead", "team", "analysis", "design", "support", "run",
    "build", "plan", "test", "data", "code", "set", "model", "view",
    "project", "process", "service", "system", "create", "manage",
    "develop", "implement", "monitor", "deploy", "train", "research",
    "r",  # R language — too ambiguous as single letter
}


class SkillScorer:
    def __init__(self, ontology: SkillOntology) -> None:
        self.ontology = ontology
        self.normalizer = SkillNormalizer(ontology)
        self.ontology_matcher = OntologyMatcher(ontology)
        self.embedding_matcher = EmbeddingSkillMatcher(ontology)
        self.llm_verifier = LLMSkillVerifier()
        self.category_classifier = SkillCategoryClassifier(ontology)

    @staticmethod
    def _section_for_char(char_index: int, sections: list[SectionSpan]) -> SectionSpan:
        if not sections:
            return SectionSpan("unknown", "", 1, 1, 0, 0, 0.3)
        for section in sections:
            if section.start_char <= char_index <= section.end_char:
                return section
        return sections[0]

    def _find_evidence_char(self, text: str, evidence: Iterable[str]) -> int:
        for item in evidence:
            position = text.find(item)
            if position >= 0:
                return position
        return 0

    def _section_multiplier(self, section: str) -> float:
        return SECTION_CONFIDENCE.get(section, 0.3)

    def _match_taxonomy(self, candidate: str):
        match = self.ontology_matcher.match(candidate)
        return match if match.matched else None

    # ------------------------------------------------------------------
    # Hard-negative detection
    # ------------------------------------------------------------------
    @staticmethod
    def _is_person_like(candidate: str) -> bool:
        cleaned = "".join(character if character.isalpha() or character in {" ", "'", "-"} else " " for character in candidate).strip()
        if not cleaned:
            return False

        words = [word for word in cleaned.split() if word]
        if len(words) > 4:
            return False

        titlecase_count = sum(1 for word in words if word[:1].isupper())
        return len(words) >= 2 and titlecase_count >= 2 and all(word.lower() not in DEFAULT_REJECT_TERMS for word in words)

    @staticmethod
    def _is_hard_negative(candidate: str, record: CandidateRecord) -> bool:
        """Reject job titles, military roles, generic HR phrases, and person-like names."""
        lower = candidate.casefold().strip()

        # Job titles
        if lower in _JOB_TITLES:
            return True

        # Military roles
        if lower in _MILITARY_ROLES:
            return True

        # Generic professional phrases
        if lower in _GENERIC_PHRASES:
            return True

        # Multi-word generic phrases
        words = lower.split()
        if len(words) >= 2 and all(w in _JOB_TITLES | _GENERIC_PHRASES for w in words):
            return True

        # Person-like check (2+ capitalized words, no tech indicators)
        if SkillScorer._is_person_like(candidate):
            return True

        return False

    # ------------------------------------------------------------------
    # Evidence grounding — the non-negotiable hard gate
    # ------------------------------------------------------------------
    def _find_raw_text_evidence(self, candidate: str, text: str) -> tuple[str | None, str | None]:
        """
        Check if candidate (or its ontology aliases) explicitly exists in the raw text.
        Returns (exact_span, matched_alias) or (None, None) if not found.
        """
        normalized_text = self.normalizer.key(text)

        # 1. Check exact match of candidate in raw text
        candidate_key = self.normalizer.key(candidate)
        if candidate_key and self._contains_normalized_span(normalized_text, candidate_key):
            # Find the actual span in original text
            span = self._find_span_in_text(candidate, text)
            return span, candidate

        # 2. Check aliases from ontology
        concept = self.ontology.resolve_concept(candidate)
        if concept is not None:
            all_names = [concept.canonical, *concept.aliases]
            for alias in all_names:
                alias_key = self.ontology.normalize_key(alias)
                if alias_key and self._contains_normalized_span(normalized_text, alias_key):
                    span = self._find_span_in_text(alias, text)
                    return span, alias

        return None, None

    @staticmethod
    def _contains_normalized_span(haystack: str, needle: str) -> bool:
        if not needle:
            return False
        start = 0
        while True:
            index = haystack.find(needle, start)
            if index < 0:
                return False
            before = haystack[index - 1] if index > 0 else " "
            after_index = index + len(needle)
            after = haystack[after_index] if after_index < len(haystack) else " "
            if not before.isalnum() and before not in {"+", "#", "."} and not after.isalnum() and after not in {"+", "#", "."}:
                return True
            start = index + 1

    @staticmethod
    def _find_span_in_text(needle: str, haystack: str) -> str | None:
        """Find the sentence/line in haystack that contains needle (case-insensitive)."""
        needle_lower = needle.casefold()
        for line in haystack.splitlines():
            if needle_lower in line.casefold():
                return line.strip()
        return None

    @staticmethod
    def _is_structured_line(line: str) -> bool:
        """Check if a line looks like a structured skill listing."""
        stripped = line.strip()
        if not stripped:
            return False
        if stripped[0] in {'-', '•', '▪', '►', '●', '○', '★', '✓', '*'}:
            return True
        if len(stripped) >= 3 and stripped[0].isdigit() and stripped[1] in {".", ")", "-"} and stripped[2].isspace():
            return True
        for delimiter in (',', '|', ';'):
            if stripped.count(delimiter) >= 2:
                return True
        return False

    @staticmethod
    def _surface_skill_score(candidate: str, section: SectionSpan, record: CandidateRecord) -> float:
        compact = candidate.replace(" ", "")
        words = [word for word in candidate.replace("/", " ").replace("-", " ").split() if word]
        score = 0.0

        if any(character.isdigit() for character in candidate):
            score += 0.18
        if any(character in candidate for character in (".", "+", "#", "/", "-")):
            score += 0.22
        if any(word.isupper() and 2 <= len(word) <= 6 for word in words):
            score += 0.22
        if any(any(character.islower() for character in word) and any(character.isupper() for character in word[1:]) for word in words):
            score += 0.16
        if 1 <= len(words) <= 4 and 2 <= len(compact) <= 32:
            score += 0.12
        if section.name == "technical_skills":
            score += 0.22
        elif section.name in {"projects", "experience", "certifications"}:
            score += 0.12
        if record.sources.get("layout", 0.0) > 0:
            score += 0.18
        if record.sources.get("context", 0.0) > 0:
            score += 0.1
        if record.sources.get("business_context", 0.0) > 0:
            score += 0.22
        return min(1.0, score)

    # ------------------------------------------------------------------
    # Scoring helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _frequency_multiplier(count: int) -> float:
        return min(1.0, 1.0 - exp(-0.6 * count)) if count > 0 else 0.0

    def _context_multiplier(self, record: CandidateRecord) -> float:
        """Context is now a BONUS ONLY — used for ranking, never for validation."""
        if record.context_score > 0:
            return 0.9
        if record.business_context_score > 0:
            return 0.82
        if record.phrase_score > 0 and record.sources.get("phrase", 0.0) > 0:
            return 0.7
        if record.ner_score > 0:
            return 0.55
        return 0.35

    def _validate_candidate(
        self,
        candidate: str,
        record: CandidateRecord,
        section: SectionSpan,
        ontology_match: OntologyMatch | None,
    ) -> tuple[float, float]:
        if ontology_match is not None and ontology_match.matched:
            record.ontology_score = ontology_match.confidence
            record.embedding_score = 0.0
            return 1.0, ontology_match.confidence

        embedding_match = self.embedding_matcher.match(candidate)
        semantic_score = embedding_match.confidence
        record.embedding_score = semantic_score

        section_bonus = self._section_multiplier(section.name)
        if section.name in {"languages", "interests"}:
            section_bonus *= 0.45

        if semantic_score >= 0.5:
            return min(1.0, 0.6 * semantic_score + 0.4 * section_bonus), semantic_score

        llm_decision = self.llm_verifier.verify(candidate, sorted(record.evidence), section.name)
        if llm_decision.accepted:
            record.llm_score = llm_decision.confidence
            return min(1.0, 0.65 * llm_decision.confidence + 0.35 * section_bonus), semantic_score

        heuristic = self._surface_skill_score(candidate, section, record)
        key = self.normalizer.key(candidate)
        if any(term in key for term in ("management", "development", "design", "analysis", "configuration", "administration", "implementation")):
            heuristic = max(heuristic, 0.55)
        elif any(term in key for term in ("gestion", "developpement", "conception", "analyse", "configuration", "administration", "deploiement")):
            heuristic = max(heuristic, 0.55)
        elif any(term in key for term in ("agile", "scrum", "kanban", "leadership", "collaboration", "communication", "project")):
            heuristic = max(heuristic, 0.45)
        elif any(separator in candidate for separator in (".", "+", "#", "/", "-")):
            heuristic = max(heuristic, 0.4)

        validation_score = max(0.0, min(1.0, heuristic * 0.45 + section_bonus * 0.55))
        return validation_score, semantic_score

    def _score_candidate(
        self,
        candidate: str,
        record: CandidateRecord,
        section: SectionSpan,
        ontology_match: OntologyMatch | None,
    ) -> float:
        validation_score, semantic_score = self._validate_candidate(candidate, record, section, ontology_match)
        record.validation_score = validation_score
        record.semantic_score = semantic_score

        source_score = max(record.sources.values()) if record.sources else 0.0
        section_score = self._section_multiplier(section.name)
        frequency_score = self._frequency_multiplier(record.count)
        context_score = self._context_multiplier(record)

        # Updated weights: validation dominant, context is bonus only
        final_score = (
            0.35 * validation_score
            + 0.25 * section_score
            + 0.20 * semantic_score
            + 0.15 * context_score
            + 0.05 * frequency_score
            + 0.05 * source_score
        )
        if candidate in record.original:
            final_score += 0.02
        return min(1.0, round(final_score, 4))

    # ------------------------------------------------------------------
    # Build skill mention (with hard gates)
    # ------------------------------------------------------------------
    def _build_skill_mention(
        self,
        candidate: str,
        record: CandidateRecord,
        section: SectionSpan,
        text: str,
    ) -> SkillMention | None:
        word_count = len(candidate.split())
        exact_hit = self._match_taxonomy(candidate)

        # =============================================
        # HARD GATE 1: Hard negative filter
        # =============================================
        if exact_hit is None and self._is_hard_negative(candidate, record):
            return None

        # =============================================
        # HARD GATE 2: No evidence = no skill
        # =============================================
        if not record.evidence:
            return None

        # =============================================
        # HARD GATE 3: Raw text evidence grounding (NON-NEGOTIABLE)
        # The candidate (or its aliases) MUST explicitly appear in the raw text.
        # Ontology match alone is NOT sufficient.
        # Context score does NOT bypass this gate.
        # =============================================
        exact_span, matched_alias = self._find_raw_text_evidence(candidate, text)
        if exact_span is None:
            return None  # No raw text evidence → reject immediately

        # =============================================
        # HARD GATE 4: Ambiguous single-word filter
        # =============================================
        if word_count == 1:
            candidate_lower = candidate.casefold()
            if candidate_lower in _AMBIGUOUS_SINGLE_WORDS:
                # Only allow if in technical_skills section or structured list
                in_tech_section = section.name == "technical_skills"
                in_structured = self._is_structured_line(exact_span)
                if not in_tech_section and not in_structured:
                    return None

        # =============================================
        # HARD GATE 6: Person-like names (legacy check)
        # =============================================
        if exact_hit is None and self._is_person_like(candidate):
            return None

        # Existing section-based filters
        if section.name in {"languages", "interests"} and exact_hit is None:
            return None

        if exact_hit is None and word_count == 1:
            in_tech_section = section.name == "technical_skills"
            in_structured = self._is_structured_line(exact_span)
            if not in_tech_section and not in_structured:
                return None
            if self._surface_skill_score(candidate, section, record) < 0.35:
                return None

        if exact_hit is None and word_count > 4 and record.sources.get("context", 0.0) <= 0 and record.sources.get("business_context", 0.0) <= 0:
            return None

        confidence = self._score_candidate(candidate, record, section, exact_hit)
        decision = self.category_classifier.classify(candidate, section, record, record.semantic_score)
        normalized = self.normalizer.normalize(candidate)
        category = exact_hit.category if exact_hit is not None and exact_hit.category is not None else decision.category
        canonical_name = exact_hit.canonical if exact_hit is not None else decision.canonical

        if record.validation_score < 0.18 and category not in TECHNOLOGY_FAMILY | COMPETENCY_FAMILY:
            return None

        # =============================================
        # FINAL HARD GATES (after scoring)
        # =============================================
        # Gate: minimum confidence
        if confidence < 0.55:
            return None

        # Gate: semantic quality check
        if exact_hit is None and record.semantic_score < 0.5 and record.validation_score < 0.58:
            return None

        evidence = sorted(item for item in record.evidence if item)
        return SkillMention(
            original=record.original,
            normalized=normalized,
            category=category,
            confidence=confidence,
            section=section.name,
            sources=sorted(record.sources.keys()),
            evidence=evidence,
            count=record.count,
            scores={
                "validation": round(record.validation_score, 4),
                "semantic": round(record.semantic_score or decision.confidence, 4),
                "ontology": round(record.ontology_score, 4),
                "embedding": round(record.embedding_score, 4),
                "llm": round(record.llm_score, 4),
                "section": round(section.confidence if section.confidence else self._section_multiplier(section.name), 4),
                "source": round(max(record.sources.values()) if record.sources else 0.0, 4),
                "context": round(record.context_score, 4),
                "business_context": round(record.business_context_score, 4),
                "frequency": round(self._frequency_multiplier(record.count), 4),
            },
            canonical=canonical_name,
            exact_span=exact_span,
            matched_alias=matched_alias,
            section_source=section.name,
        )

    def build(self, candidates: dict[str, CandidateRecord], sections: list[SectionSpan], text: str) -> list[SkillMention]:
        """
        Evidence-first pipeline:
        1. Verify evidence (hard gate) for each candidate
        2. Score only validated candidates
        3. Return ranked results
        """
        skill_mentions: list[SkillMention] = []
        for key, record in candidates.items():
            section = self._section_for_char(0, sections)
            if record.evidence:
                section = self._section_for_char(self._find_evidence_char(text, record.evidence), sections)
            # _build_skill_mention now enforces all hard gates internally
            mention = self._build_skill_mention(record.original, record, section, text)
            if mention is None:
                continue
            skill_mentions.append(mention)
        return skill_mentions
