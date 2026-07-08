from __future__ import annotations

import logging
import os
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.services.certification_extraction.models import CertificationMention
from app.services.experience_extraction.date_parser import BilingualDateRangeParser
from app.services.experience_extraction.models import ParsedDateRange

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LLMCertificationReview:
    available: bool
    provider: str
    certifications: list[CertificationMention]
    accepted_count: int
    corrected_count: int
    added_count: int
    rejected_count: int
    reason: str


class LLMCertificationVerifier:
    def __init__(self) -> None:
        if load_dotenv is not None:
            load_dotenv(Path(__file__).resolve().parents[2] / ".env")
        self.provider = (
            os.getenv("TALENTFLOW_CERTIFICATION_LLM_PROVIDER")
            or os.getenv("TALENTFLOW_EXPERIENCE_LLM_PROVIDER")
            or os.getenv("TALENTFLOW_SKILL_LLM_PROVIDER")
            or ""
        ).strip().casefold()
        self.date_parser = BilingualDateRangeParser()

    @property
    def available(self) -> bool:
        return self.provider in {"ollama", "qwen", "qwen3", "local", "local_qwen", "gemini", "gemini_flash", "deepseek"}

    def review(self, text: str, candidates: list[CertificationMention],
               db: Session | None = None, recruiter_id: int | None = None) -> LLMCertificationReview:
        if not self.available:
            logger.info("Certification LLM verification skipped: provider is not configured")
            return LLMCertificationReview(
                False, self.provider or "none", candidates, 0, 0, 0, 0, "llm_verification_not_configured"
            )

        serialized = [self._serialize(index, candidate) for index, candidate in enumerate(candidates)]
        try:
            from app.services.LLM.validate_certification import LLMService
            payload = LLMService.validate(text, serialized, db=db, recruiter_id=recruiter_id)
        except Exception as exc:
            logger.warning("Certification LLM verification failed: %s", type(exc).__name__)
            return LLMCertificationReview(
                True, self.provider, candidates, 0, 0, 0, 0, f"llm_error:{type(exc).__name__}"
            )

        decisions: dict[int, dict[str, Any]] = {}
        for item in payload.get("certifications", []):
            try:
                index = int(item.get("candidate_index"))
            except (TypeError, ValueError):
                continue
            if 0 <= index < len(candidates) and index not in decisions:
                decisions[index] = item

        reviewed: list[CertificationMention] = []
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
        for item in payload.get("certifications", []):
            if item.get("candidate_index") is not None:
                continue
            action = str(item.get("action", "")).strip().casefold()
            if action not in {"accepted", "corrected"}:
                continue
            mention = self._build_grounded_addition(text, item)
            if mention is not None:
                reviewed.append(mention)
                added += 1

        return LLMCertificationReview(
            True,
            self.provider,
            reviewed,
            accepted,
            corrected,
            added,
            rejected,
            "certifications_reviewed_by_llm",
        )

    def _build_grounded_addition(self, text: str, item: dict[str, Any]) -> CertificationMention | None:
        name = str(item.get("name", "")).strip()
        evidence = self._grounded_evidence(item.get("evidence"), text)
        if not name or not evidence:
            return None

        organization = str(item["organization"]).strip() if item.get("organization") else None
        credential_id = str(item["credential_id"]).strip() if item.get("credential_id") else None
        credential_url = str(item["credential_url"]).strip() if item.get("credential_url") else None

        date_range = self._evidence_date_range(evidence)

        issue_date = self._supported_date(item.get("issue_date"), evidence, "start")
        if issue_date is None and date_range is not None:
            issue_date = date_range.start_date
        if issue_date is None:
            issue_date = self._extract_year_date(evidence)

        raw_exp = item.get("expiration_date")
        expiration_date = None
        if raw_exp is not None:
            expiration_date = self._supported_date(raw_exp, evidence, "end")
            if expiration_date is None and date_range is not None:
                expiration_date = date_range.end_date

        raw_description = item.get("description")
        description = None
        if raw_description is not None and self._text_is_grounded(str(raw_description), text):
            description = str(raw_description).strip()

        return CertificationMention(
            name=name,
            organization=organization,
            issue_date=issue_date,
            expiration_date=expiration_date,
            credential_id=credential_id,
            credential_url=credential_url,
            description=description,
            confidence=self._addition_confidence(item.get("confidence")),
            section="llm_review",
            evidence=evidence,
        )

    @staticmethod
    def _serialize(index: int, candidate: CertificationMention) -> dict[str, Any]:
        return {
            "candidate_index": index,
            "name": candidate.name,
            "organization": candidate.organization,
            "issue_date": candidate.issue_date.date().isoformat() if candidate.issue_date else None,
            "expiration_date": candidate.expiration_date.date().isoformat() if candidate.expiration_date else None,
            "credential_id": candidate.credential_id,
            "credential_url": candidate.credential_url,
            "description": candidate.description,
            "confidence": candidate.confidence,
            "evidence": candidate.evidence,
        }

    def _apply_correction(
        self,
        text: str,
        candidate: CertificationMention,
        decision: dict[str, Any],
    ) -> CertificationMention:
        name = str(decision.get("name", "")).strip()
        if not name or not self._text_is_grounded(name, text):
            name = candidate.name

        organization = candidate.organization
        if "organization" in decision:
            org_value = decision.get("organization")
            organization = str(org_value).strip() if org_value and self._text_is_grounded(str(org_value), text) else None

        credential_id = candidate.credential_id
        if "credential_id" in decision:
            cid_value = decision.get("credential_id")
            credential_id = str(cid_value).strip() if cid_value else None

        credential_url = candidate.credential_url
        if "credential_url" in decision:
            curl_value = decision.get("credential_url")
            credential_url = str(curl_value).strip() if curl_value else None

        description = candidate.description
        if "description" in decision:
            description_value = decision.get("description")
            if description_value is None:
                description = None
            elif self._text_is_grounded(str(description_value), text):
                description = str(description_value).strip()

        issue_date = (
            self._supported_date(decision.get("issue_date"), candidate.evidence, "start")
            or candidate.issue_date
        )
        raw_exp = decision.get("expiration_date")
        if raw_exp is None:
            expiration_date = candidate.expiration_date
        else:
            expiration_date = self._supported_date(raw_exp, candidate.evidence, "end") or candidate.expiration_date

        confidence = self._blended_confidence(candidate.confidence, decision.get("confidence"))
        return CertificationMention(
            name=name,
            organization=organization,
            issue_date=issue_date,
            expiration_date=expiration_date,
            credential_id=credential_id,
            credential_url=credential_url,
            description=description,
            confidence=confidence,
            section=candidate.section,
            evidence=candidate.evidence,
        )

    def _with_llm_confidence(
        self,
        candidate: CertificationMention,
        decision: dict[str, Any],
    ) -> CertificationMention:
        return CertificationMention(
            name=candidate.name,
            organization=candidate.organization,
            issue_date=candidate.issue_date,
            expiration_date=candidate.expiration_date,
            credential_id=candidate.credential_id,
            credential_url=candidate.credential_url,
            description=candidate.description,
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
        if not evidence:
            return parsed
        for line in evidence:
            date_range = self.date_parser.find(line)
            if date_range is None:
                continue
            supported = date_range.start_date if boundary == "start" else date_range.end_date
            if parsed == supported:
                return parsed
        return None

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
