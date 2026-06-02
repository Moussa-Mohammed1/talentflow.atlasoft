from __future__ import annotations

from functools import lru_cache
import re
import unicodedata

import spacy

from app.services.identity_extraction.constants import CONTACT_HINTS, LOCATION_HINTS, NAME_BLACKLIST, NORMALIZED_NAME_BLACKLIST
from app.services.identity_extraction.models import CandidateScore


class NameExtractor:
    def __init__(self) -> None:
        self._nlp = self._load_spacy_model()

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_spacy_model():
        try:
            return spacy.load("fr_core_news_md")
        except Exception:
            try:
                return spacy.load("fr_core_news_sm")
            except Exception:
                return spacy.blank("fr")

    @staticmethod
    def _line_score(index: int, total: int) -> float:
        if total <= 0:
            return 0.0
        return max(0.05, 1.0 - (index / max(total - 1, 1)) * 0.8)

    @staticmethod
    def _format_score(line: str) -> float:
        stripped = line.strip()
        if not stripped:
            return 0.0
        if stripped.isupper() and 2 <= len(stripped.split()) <= 5:
            return 0.95
        words = stripped.split()
        if 2 <= len(words) <= 4 and all(word[:1].isupper() for word in words if word):
            return 0.9
        return 0.45

    @staticmethod
    def _tokenize_name(candidate: str) -> list[str]:
        return [token for token in re.split(r"\s+", candidate.strip()) if token]

    @staticmethod
    def _looks_like_name(candidate: str) -> bool:
        cleaned = re.sub(r"[^A-Za-zÀ-ÿ'\-\s]", " ", candidate).strip()
        if not cleaned:
            return False
        normalized = NameExtractor._normalize_name_key(cleaned)
        if any(term in normalized for term in NORMALIZED_NAME_BLACKLIST):
            return False
        if any(term in normalized for term in LOCATION_HINTS):
            return False
        if any(char.isdigit() for char in cleaned):
            return False
        words = [word for word in cleaned.split() if word]
        if not (2 <= len(words) <= 4):
            return False
        if not all(len(word) > 1 for word in words):
            return False
        if any("@" in word or "." in word for word in words):
            return False
        if any(token.casefold() in {"developer", "engineer", "student", "intern", "profile", "skills", "contact"} for token in words):
            return False
        return True

    @staticmethod
    def _normalize_name_key(candidate: str) -> str:
        normalized = unicodedata.normalize("NFKD", candidate).encode("ascii", "ignore").decode("ascii")
        normalized = normalized.casefold()
        normalized = re.sub(r"[^a-z0-9\s-]", " ", normalized)
        normalized = re.sub(r"[-–—]+", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    @staticmethod
    def _title_case_name(candidate: str) -> str:
        parts = []
        for word in re.split(r"(\s+)", candidate.strip()):
            if not word or word.isspace():
                parts.append(word)
                continue
            if "-" in word:
                parts.append("-".join(piece[:1].upper() + piece[1:].lower() for piece in word.split("-")))
            else:
                parts.append(word[:1].upper() + word[1:].lower())
        return "".join(parts).strip()

    @staticmethod
    def _contact_window(lines: list[str]) -> int:
        for index, line in enumerate(lines[:12]):
            lower = line.casefold()
            if any(hint in lower for hint in CONTACT_HINTS):
                return index
        return min(4, max(0, len(lines) - 1))

    def _extract_name_candidates(self, lines: list[str], text: str) -> list[CandidateScore]:
        candidates: list[CandidateScore] = []
        contact_window = self._contact_window(lines)

        for index, line in enumerate(lines[: min(len(lines), 12)]):
            if not self._looks_like_name(line):
                continue
            lower = line.casefold()
            if any(hint in lower for hint in CONTACT_HINTS):
                continue
            if any(term in lower for term in NAME_BLACKLIST):
                continue

            line_score = self._line_score(index, len(lines))
            format_score = self._format_score(line)
            proximity_score = 1.0 if index <= contact_window else 0.55
            value = self._title_case_name(line)
            candidates.append(
                CandidateScore(
                    value=value,
                    confidence=min(0.98, 0.42 + line_score * 0.32 + format_score * 0.18 + proximity_score * 0.12),
                    evidence=[line],
                    signals={"position": line_score, "format": format_score, "contact": proximity_score, "validation": 1.0},
                )
            )

        doc = self._nlp(text)
        for ent in getattr(doc, "ents", []):
            if ent.label_ != "PER":
                continue
            candidate = ent.text.strip()
            if not self._looks_like_name(candidate):
                continue
            line_index = next((i for i, line in enumerate(lines) if candidate.casefold() in line.casefold()), 0)
            line_score = self._line_score(line_index, len(lines))
            ner_score = 0.95 if len(candidate.split()) >= 2 else 0.65
            value = self._title_case_name(candidate)
            candidates.append(
                CandidateScore(
                    value=value,
                    confidence=min(0.96, 0.34 + line_score * 0.26 + ner_score * 0.28 + self._format_score(lines[line_index] if lines else candidate) * 0.12),
                    evidence=[candidate],
                    signals={"position": line_score, "format": self._format_score(lines[line_index] if lines else candidate), "ner": ner_score, "validation": 1.0},
                )
            )

        filtered: list[CandidateScore] = []
        for item in candidates:
            normalized = self._normalize_name_key(item.value)
            if any(term in normalized for term in NORMALIZED_NAME_BLACKLIST):
                continue
            filtered.append(item)

        return filtered
