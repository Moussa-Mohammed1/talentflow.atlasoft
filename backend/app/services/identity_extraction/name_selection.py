from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
import re
import unicodedata
from typing import Any

import spacy

from app.services.identity_extraction.constants import (
    CONTACT_HINTS,
    EMAIL_PATTERN,
    NAME_BLACKLIST,
    NAME_HEADER_LINE_LIMIT,
    NAME_JOB_TITLE_TERMS,
    NAME_MAX_WORDS,
    NAME_MIN_WORDS,
    NAME_OUTPUT_LIMIT,
    NAME_SCORE_WEIGHTS,
    NAME_SCAN_LINE_LIMIT,
    NAME_SECTION_TITLES,
    NAME_TECHNICAL_TERMS,
    NAME_TOP_LINE_LIMIT,
    NON_PERSON_NAME_TOKENS,
    NORMALIZED_NAME_BLACKLIST,
    PHONE_PATTERN,
    URL_PATTERN,
)
from app.services.identity_extraction.models import NameCandidateScore, NameExtractionResult


@dataclass
class RawNameCandidate:
    value: str
    evidence: list[str] = field(default_factory=list)
    sources: set[str] = field(default_factory=set)
    line_indices: set[int] = field(default_factory=set)
    occurrences: int = 1


@dataclass(frozen=True)
class NameScoringContext:
    total_lines: int
    first_contact_index: int


class NameCandidateGenerator:
    def __init__(self) -> None:
        self._nlp = self._load_spacy_model()

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_spacy_model():
        for model_name in ("en_core_web_sm", "fr_core_news_md", "fr_core_news_sm"):
            try:
                return spacy.load(model_name)
            except Exception:
                continue
        return spacy.blank("xx")

    @property
    def model_name(self) -> str:
        if hasattr(self._nlp, "meta"):
            return str(getattr(self._nlp, "meta", {}).get("name", "unknown"))
        return "unknown"

    @staticmethod
    def _normalize_key(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
        normalized = normalized.casefold()
        normalized = re.sub(r"[^a-z0-9\s-]", " ", normalized)
        normalized = re.sub(r"[-–—]+", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    @staticmethod
    def _title_case(value: str) -> str:
        pieces: list[str] = []
        for token in re.split(r"(\s+)", value.strip()):
            if not token or token.isspace():
                pieces.append(token)
                continue
            if "-" in token:
                pieces.append("-".join(part[:1].upper() + part[1:].lower() for part in token.split("-")))
            else:
                pieces.append(token[:1].upper() + token[1:].lower())
        return "".join(pieces).strip()

    @staticmethod
    def _token_count(value: str) -> int:
        return len([token for token in re.split(r"\s+", value.strip()) if token])

    @staticmethod
    def _looks_like_title_case(value: str) -> bool:
        tokens = [token for token in re.split(r"\s+", value.strip()) if token]
        if not tokens:
            return False
        if all(token.isupper() for token in tokens):
            return True
        return all(token[:1].isupper() and token[1:].islower() for token in tokens if len(token) > 1)

    @staticmethod
    def _looks_like_address(value: str) -> bool:
        patterns = (
            r"\b(?:street|st\.?|avenue|ave\.?|boulevard|road|rd\.?|lane|ln\.?|drive|dr\.?|apartment|apt\.?|suite|postal|zip|code|bp|box)\b",
            r"\b\d{1,5}\s+[A-Za-z]",
            r"\b\d{4,6}\b",
        )
        return any(re.search(pattern, value, re.IGNORECASE) for pattern in patterns)

    @staticmethod
    def _looks_like_contact(value: str) -> bool:
        return bool(
            EMAIL_PATTERN.search(value)
            or PHONE_PATTERN.search(value)
            or URL_PATTERN.search(value)
            or "@" in value
        )

    @staticmethod
    def _looks_like_section_title(value: str) -> bool:
        normalized = NameCandidateGenerator._normalize_key(value)
        words = [word for word in normalized.split() if word]
        if not words or len(words) > 5:
            return False
        if normalized in NAME_SECTION_TITLES:
            return True
        if value.strip().endswith(":"):
            return True
        if value.strip().isupper() and any(word in NAME_SECTION_TITLES for word in words):
            return True
        return False

    @staticmethod
    def _find_first_contact_index(lines: list[str]) -> int:
        for index, line in enumerate(lines[:NAME_SCAN_LINE_LIMIT]):
            lower = line.casefold()
            if any(hint in lower for hint in CONTACT_HINTS):
                return index
            if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line) or URL_PATTERN.search(line):
                return index
        return len(lines)

    def _merge_candidate(
        self,
        bucket: dict[str, RawNameCandidate],
        value: str,
        source: str,
        evidence: str,
        line_index: int | None = None,
    ) -> None:
        candidate = value.strip()
        if not candidate:
            return
        key = self._normalize_key(candidate)
        if not key:
            return
        display_value = self._title_case(candidate)
        existing = bucket.get(key)
        if existing is None:
            bucket[key] = RawNameCandidate(
                value=display_value,
                evidence=[evidence],
                sources={source},
                line_indices={line_index} if line_index is not None else set(),
            )
            return
        existing.value = display_value
        existing.sources.add(source)
        if evidence and evidence not in existing.evidence:
            existing.evidence.append(evidence)
        if line_index is not None:
            existing.line_indices.add(line_index)
        existing.occurrences += 1

    def _extract_labelled_candidates(self, lines: list[str], bucket: dict[str, RawNameCandidate]) -> None:
        label_pattern = re.compile(r"(?i)^\s*(?:full\s*name|name|candidate|profile|profil)\s*[:\-]\s*(?P<value>.+?)\s*$")
        for index, line in enumerate(lines[:NAME_SCAN_LINE_LIMIT]):
            match = label_pattern.match(line)
            if not match:
                continue
            candidate = match.group("value").strip()
            if candidate:
                self._merge_candidate(bucket, candidate, "label", line, index)

    def _extract_line_candidates(
        self,
        lines: list[str],
        first_contact_index: int,
        bucket: dict[str, RawNameCandidate],
    ) -> None:
        for index, line in enumerate(lines[:NAME_SCAN_LINE_LIMIT]):
            if not line:
                continue
            normalized = self._normalize_key(line)
            if not normalized:
                continue
            if self._looks_like_contact(line):
                continue
            if any(term in normalized for term in NORMALIZED_NAME_BLACKLIST):
                continue
            if any(term in normalized for term in NAME_BLACKLIST):
                continue
            if self._looks_like_section_title(line):
                continue

            token_count = self._token_count(line)
            if token_count < NAME_MIN_WORDS or token_count > NAME_MAX_WORDS:
                continue
            if sum(1 for token in normalized.split() if token in NON_PERSON_NAME_TOKENS) >= 2:
                continue

            if self._looks_like_title_case(line) or line.isupper():
                primary_source = "header" if index < NAME_HEADER_LINE_LIMIT else "layout"
                self._merge_candidate(bucket, line, primary_source, line, index)
                if index < NAME_TOP_LINE_LIMIT:
                    self._merge_candidate(bucket, line, "first_lines", line, index)
                if index <= first_contact_index:
                    self._merge_candidate(bucket, line, "near_contact", line, index)

            regex_matches = re.finditer(r"(?<!\S)([A-ZÀ-Ÿ][\w'’\-]+(?:\s+[A-ZÀ-Ÿ][\w'’\-]+){1,3})(?!\S)", line)
            for match in regex_matches:
                candidate = match.group(1).strip()
                if candidate and candidate.casefold() != line.casefold():
                    self._merge_candidate(bucket, candidate, "heuristic", line, index)

    def _extract_ner_candidates(self, text: str, lines: list[str], bucket: dict[str, RawNameCandidate]) -> None:
        doc = self._nlp(text)
        for ent in getattr(doc, "ents", []):
            if ent.label_ not in {"PER", "PERSON"}:
                continue
            candidate = ent.text.strip()
            if not candidate:
                continue
            line_index = next((i for i, line in enumerate(lines[:NAME_SCAN_LINE_LIMIT]) if candidate.casefold() in line.casefold()), None)
            self._merge_candidate(bucket, candidate, "ner", candidate, line_index)

    def _extract_email_candidates(self, email_candidates: list[str], bucket: dict[str, RawNameCandidate]) -> None:
        for email in email_candidates:
            local_part = email.split("@", 1)[0].strip()
            if not local_part:
                continue
            local_part = re.sub(r"\d+", " ", local_part)
            local_part = re.sub(r"[._-]+", " ", local_part)
            local_part = re.sub(r"\s+", " ", local_part).strip()
            if not local_part:
                continue
            words = [word for word in local_part.split() if len(word) > 1]
            if len(words) < NAME_MIN_WORDS:
                continue
            candidate = self._title_case(" ".join(words[:NAME_MAX_WORDS]))
            self._merge_candidate(bucket, candidate, "email_fallback", email, None)

    def generate(self, lines: list[str], text: str, email_candidates: list[str]) -> list[RawNameCandidate]:
        bucket: dict[str, RawNameCandidate] = {}
        first_contact_index = self._find_first_contact_index(lines)
        self._extract_labelled_candidates(lines, bucket)
        self._extract_line_candidates(lines, first_contact_index, bucket)
        self._extract_ner_candidates(text, lines, bucket)
        self._extract_email_candidates(email_candidates, bucket)
        return list(bucket.values())


class NameCandidateFilter:
    @staticmethod
    def _normalize(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
        normalized = normalized.casefold()
        normalized = re.sub(r"[^a-z0-9\s-]", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    def allow(self, candidate: RawNameCandidate) -> bool:
        value = candidate.value.strip()
        if not value:
            return False
        normalized = self._normalize(value)
        if not normalized:
            return False
        if any(char.isdigit() for char in value):
            return False
        if any(term in normalized for term in NORMALIZED_NAME_BLACKLIST):
            return False
        if any(term in normalized for term in NAME_BLACKLIST):
            return False
        if any(term in normalized for term in NAME_JOB_TITLE_TERMS):
            return False
        if any(term in normalized for term in NAME_TECHNICAL_TERMS):
            return False
        if NameCandidateGenerator._looks_like_contact(value):
            return False
        if NameCandidateGenerator._looks_like_address(value):
            return False
        if NameCandidateGenerator._looks_like_section_title(value):
            return False
        words = [word for word in re.split(r"\s+", value.strip()) if word]
        if len(words) < NAME_MIN_WORDS or len(words) > NAME_MAX_WORDS:
            return False
        return True

    def filter(self, candidates: list[RawNameCandidate]) -> list[RawNameCandidate]:
        return [candidate for candidate in candidates if self.allow(candidate)]


class NameCandidateScorer:
    @staticmethod
    def _score_to_confidence(score: int) -> float:
        if score >= 90:
            return min(0.99, 0.95 + (score - 90) * 0.004)
        if score >= 75:
            return 0.85 + (score - 75) * (0.08 / 15)
        if score >= 60:
            return 0.70 + (score - 60) * (0.10 / 15)
        if score >= 40:
            return 0.50 + (score - 40) * (0.18 / 20)
        return max(0.05, min(0.40, score / 120))

    @staticmethod
    def _normalize(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
        normalized = normalized.casefold()
        normalized = re.sub(r"[^a-z0-9\s-]", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    @staticmethod
    def _structure_is_valid(value: str) -> bool:
        words = [word for word in re.split(r"\s+", value.strip()) if word]
        if not (NAME_MIN_WORDS <= len(words) <= NAME_MAX_WORDS):
            return False
        if all(word.isupper() for word in words):
            return True
        return all(word[:1].isupper() and word[1:].islower() for word in words if len(word) > 1)

    def score(self, candidate: RawNameCandidate, context: NameScoringContext) -> NameCandidateScore:
        value = candidate.value.strip()
        normalized = self._normalize(value)
        words = [word for word in re.split(r"\s+", value) if word]
        score = 0
        signals: list[str] = []

        if "ner" in candidate.sources:
            score += NAME_SCORE_WEIGHTS["ner"]
            signals.append("ner")
        if "header" in candidate.sources:
            score += NAME_SCORE_WEIGHTS["header"]
            signals.append("header")
        if "layout" in candidate.sources:
            score += 10
            signals.append("layout")
        if "first_lines" in candidate.sources:
            score += NAME_SCORE_WEIGHTS["first_lines"]
            signals.append("first_lines")
        if candidate.line_indices and min(candidate.line_indices) <= context.first_contact_index:
            score += NAME_SCORE_WEIGHTS["near_contact"]
            signals.append("near_email")
        if self._structure_is_valid(value):
            score += NAME_SCORE_WEIGHTS["valid_structure"]
            signals.append("valid_structure")
        if candidate.occurrences > 1:
            score += NAME_SCORE_WEIGHTS["repeated"]
            signals.append("repeated")

        if any(char.isdigit() for char in value):
            score += NAME_SCORE_WEIGHTS["digits"]
        if any(term in normalized for term in NORMALIZED_NAME_BLACKLIST):
            score += NAME_SCORE_WEIGHTS["blacklist"]
        if any(term in normalized for term in NAME_JOB_TITLE_TERMS):
            score += NAME_SCORE_WEIGHTS["job_title"]
        if any(term in normalized for term in NAME_TECHNICAL_TERMS):
            score += NAME_SCORE_WEIGHTS["technical"]
        if len(words) < NAME_MIN_WORDS or len(words) > NAME_MAX_WORDS:
            score += NAME_SCORE_WEIGHTS["length"]
        if NameCandidateGenerator._looks_like_address(value):
            score += NAME_SCORE_WEIGHTS["address"]
        if NameCandidateGenerator._looks_like_contact(value):
            score += NAME_SCORE_WEIGHTS["contact_like"]
        if NameCandidateGenerator._looks_like_section_title(value):
            score += NAME_SCORE_WEIGHTS["uppercase_title"]

        normalized_score = max(0, min(100, score))
        confidence = self._score_to_confidence(normalized_score)
        return NameCandidateScore(value=value, score=normalized_score, confidence=confidence, signals=signals)


class NameCandidateSelector:
    @staticmethod
    def select(candidates: list[NameCandidateScore]) -> NameExtractionResult:
        if not candidates:
            return NameExtractionResult(full_name="", confidence=0.0, score=0, candidates=[])
        ranked = sorted(candidates, key=lambda item: (-item.score, -item.confidence, item.value.casefold()))
        best = ranked[0]
        return NameExtractionResult(
            full_name=best.value,
            confidence=best.confidence,
            score=best.score,
            candidates=ranked[:NAME_OUTPUT_LIMIT],
        )

    
class NameExtractor:
    def __init__(self) -> None:
        self.generator = NameCandidateGenerator()
        self.filter = NameCandidateFilter()
        self.scorer = NameCandidateScorer()
        self.selector = NameCandidateSelector()

    @property
    def spacy_model_name(self) -> str:
        return self.generator.model_name

    def extract(
        self,
        lines: list[str],
        text: str,
        email_candidates: list[Any] | None = None,
        phone_candidates: list[Any] | None = None,
    ) -> NameExtractionResult:
        del phone_candidates
        email_values = [candidate.value for candidate in (email_candidates or []) if getattr(candidate, "value", "")]
        raw_candidates = self.generator.generate(lines, text, email_values)
        filtered_candidates = self.filter.filter(raw_candidates)
        context = NameScoringContext(total_lines=len(lines), first_contact_index=NameCandidateGenerator._find_first_contact_index(lines))
        scored_candidates = [self.scorer.score(candidate, context) for candidate in filtered_candidates]
        return self.selector.select(scored_candidates)
