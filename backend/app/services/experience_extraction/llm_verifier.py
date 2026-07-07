from __future__ import annotations

import os
import logging
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from app.services.LLM.validate_experience import LLMService
from app.services.experience_extraction.date_parser import BilingualDateRangeParser
from app.services.experience_extraction.models import ExperienceMention, ParsedDateRange

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LLMExperienceReview:
    available: bool
    provider: str
    experiences: list[ExperienceMention]
    accepted_count: int
    corrected_count: int
    added_count: int
    rejected_count: int
    reason: str


class LLMExperienceVerifier:
    def __init__(self) -> None:
        if load_dotenv is not None:
            load_dotenv(Path(__file__).resolve().parents[2] / ".env")
        self.provider = (
            os.getenv("TALENTFLOW_EXPERIENCE_LLM_PROVIDER")
            or os.getenv("TALENTFLOW_SKILL_LLM_PROVIDER")
            or ""
        ).strip().casefold()
        self.date_parser = BilingualDateRangeParser()

    @property
    def available(self) -> bool:
        return self.provider in {"ollama", "qwen", "qwen3", "local", "local_qwen", "gemini", "gemini_flash", "deepseek"}

    def review(self, text: str, candidates: list[ExperienceMention]) -> LLMExperienceReview:
        if not self.available:
            logger.info("Experience LLM verification skipped: provider is not configured")
            return LLMExperienceReview(
                False, self.provider or "none", candidates, 0, 0, 0, 0, "llm_verification_not_configured"
            )

        serialized = [self._serialize(index, candidate) for index, candidate in enumerate(candidates)]
        try:
            payload = LLMService.validate(text, serialized)
        except Exception as exc:
            logger.warning("Experience LLM verification failed: %s", type(exc).__name__)
            return LLMExperienceReview(
                True, self.provider, candidates, 0, 0, 0, 0, f"llm_error:{type(exc).__name__}"
            )

        decisions: dict[int, dict[str, Any]] = {}
        for item in payload.get("experiences", []):
            try:
                index = int(item.get("candidate_index"))
            except (TypeError, ValueError):
                continue
            if 0 <= index < len(candidates) and index not in decisions:
                decisions[index] = item

        reviewed: list[ExperienceMention] = []
        accepted = corrected = rejected = 0
        for index, candidate in enumerate(candidates):
            decision = decisions.get(index)
            if decision is None:
                reviewed.append(candidate)
                continue
            action = str(decision.get("action", "accepted")).strip().casefold()
            if action == "rejected":
                rejected += 1
                continue
            if action == "corrected":
                reviewed.append(self._apply_correction(text, candidate, decision))
                corrected += 1
            elif action == "accepted":
                reviewed.append(self._with_llm_confidence(candidate, decision))
                accepted += 1
            else:
                reviewed.append(candidate)

        added = 0
        for item in payload.get("experiences", []):
            if item.get("candidate_index") is not None:
                continue
            action = str(item.get("action", "")).strip().casefold()
            if action not in {"accepted", "corrected"}:
                continue
            mention = self._build_grounded_addition(text, item)
            if mention is not None:
                reviewed.append(mention)
                added += 1

        return LLMExperienceReview(
            True,
            self.provider,
            reviewed,
            accepted,
            corrected,
            added,
            rejected,
            "experiences_reviewed_by_llm",
        )

    def _build_grounded_addition(
        self,
        text: str,
        item: dict[str, Any],
    ) -> ExperienceMention | None:
        title = str(item.get("title", "")).strip()
        evidence = self._grounded_evidence(item.get("evidence"), text)
        if not self._title_is_grounded(title, text) or not evidence:
            return None

        date_range = self._evidence_date_range(evidence)

        start_date = self._supported_date(item.get("start_date"), evidence, "start")
        if start_date is None and date_range is not None:
            start_date = date_range.start_date
        if start_date is None:
            start_date = self._extract_year_date(evidence)

        raw_end = item.get("end_date")
        end_date = None
        if raw_end is None:
            if date_range is not None and date_range.end_date is not None:
                end_date = date_range.end_date
        else:
            end_date = self._supported_date(raw_end, evidence, "end")
            if end_date is None and date_range is not None:
                end_date = date_range.end_date
            if end_date is not None and start_date is not None and end_date < start_date:
                end_date = start_date

        raw_description = item.get("description")
        description = None
        if raw_description is not None and self._text_is_grounded(str(raw_description), text):
            description = str(raw_description).strip()

        return ExperienceMention(
            title=title,
            description=description,
            start_date=start_date,
            end_date=end_date,
            confidence=self._addition_confidence(item.get("confidence")),
            section="llm_review",
            evidence=evidence,
        )

    @staticmethod
    def _extract_year_date(evidence: list[str]) -> datetime | None:
        for line in evidence:
            match = re.search(r"(?:19|20)\d{2}", line)
            if match:
                return datetime(int(match.group()), 1, 1)
        return None

    def _evidence_date_range(self, evidence: list[str]) -> ParsedDateRange | None:
        for line in evidence:
            date_range = self.date_parser.find(line)
            if date_range is not None:
                return date_range
        return None

    @staticmethod
    def _serialize(index: int, candidate: ExperienceMention) -> dict[str, Any]:
        return {
            "candidate_index": index,
            "title": candidate.title,
            "description": candidate.description,
            "start_date": candidate.start_date.date().isoformat(),
            "end_date": candidate.end_date.date().isoformat() if candidate.end_date else None,
            "confidence": candidate.confidence,
            "evidence": candidate.evidence,
        }

    def _apply_correction(
        self,
        text: str,
        candidate: ExperienceMention,
        decision: dict[str, Any],
    ) -> ExperienceMention:
        title_value = str(decision.get("title", "")).strip()
        title = title_value if self._title_is_grounded(title_value, text) else candidate.title

        description = candidate.description
        if "description" in decision:
            description_value = decision.get("description")
            if description_value is None:
                description = None
            elif self._text_is_grounded(str(description_value), text):
                description = str(description_value).strip()

        start_date = (
            self._supported_date(decision.get("start_date"), candidate.evidence, "start")
            or candidate.start_date
        )
        raw_end = decision.get("end_date")
        if raw_end is None:
            end_date = None if self._evidence_means_present(candidate.evidence) else candidate.end_date
        else:
            end_date = self._supported_date(raw_end, candidate.evidence, "end") or candidate.end_date
        if end_date is not None and end_date < start_date:
            start_date, end_date = candidate.start_date, candidate.end_date

        confidence = self._blended_confidence(candidate.confidence, decision.get("confidence"))
        return ExperienceMention(
            title=title,
            description=description,
            start_date=start_date,
            end_date=end_date,
            confidence=confidence,
            section=candidate.section,
            evidence=candidate.evidence,
        )

    def _with_llm_confidence(
        self,
        candidate: ExperienceMention,
        decision: dict[str, Any],
    ) -> ExperienceMention:
        return ExperienceMention(
            title=candidate.title,
            description=candidate.description,
            start_date=candidate.start_date,
            end_date=candidate.end_date,
            confidence=self._blended_confidence(candidate.confidence, decision.get("confidence")),
            section=candidate.section,
            evidence=candidate.evidence,
        )

    @staticmethod
    def _normalize(value: str) -> str:
        value = "".join(
            character
            for character in unicodedata.normalize("NFKD", value)
            if not unicodedata.combining(character)
        ).casefold()
        return " ".join(re.sub(r"[^a-z0-9]+", " ", value).split())

    def _title_is_grounded(self, title: str, text: str) -> bool:
        if not title:
            return False
        normalized_text = self._normalize(text)
        parts = [self._normalize(part) for part in re.split(r"[|,@]", title) if self._normalize(part)]
        return bool(parts) and all(part in normalized_text for part in parts)

    def _text_is_grounded(self, value: str, text: str) -> bool:
        normalized = self._normalize(value)
        return bool(normalized) and normalized in self._normalize(text)

    def _grounded_evidence(self, value: object, text: str) -> list[str]:
        items = value if isinstance(value, list) else [value]
        normalized_text = self._normalize(text)
        grounded: list[str] = []
        for item in items:
            evidence = str(item or "").strip()
            normalized = self._normalize(evidence)
            if normalized and normalized in normalized_text:
                grounded.append(evidence)
        return grounded

    def _supported_date(
        self,
        value: object,
        evidence: list[str],
        boundary: str,
    ) -> datetime | None:
        raw = str(value).strip()
        try:
            parsed = datetime.strptime(raw, "%Y-%m-%d")
        except (TypeError, ValueError):
            try:
                parsed = datetime.strptime(raw, "%Y-%m")
            except (TypeError, ValueError):
                return None
        for line in evidence:
            date_range = self.date_parser.find(line)
            if date_range is None:
                continue
            supported = date_range.start_date if boundary == "start" else date_range.end_date
            if parsed == supported:
                return parsed
        return None

    def _evidence_means_present(self, evidence: list[str]) -> bool:
        normalized = self._normalize(" ".join(evidence))
        return any(
            marker in normalized
            for marker in ("present", "current", "today", "aujourd hui", "actuel", "en cours")
        )

    @staticmethod
    def _blended_confidence(base: float, llm_value: object) -> float:
        try:
            llm_confidence = float(llm_value)
        except (TypeError, ValueError):
            return base
        llm_confidence = max(0.0, min(1.0, llm_confidence))
        return round((base * 0.7) + (llm_confidence * 0.3), 4)

    @staticmethod
    def _addition_confidence(value: object) -> float:
        try:
            confidence = float(value)
        except (TypeError, ValueError):
            confidence = 0.7
        return round(max(0.55, min(0.9, confidence)), 4)
