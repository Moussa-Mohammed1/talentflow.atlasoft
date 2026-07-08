from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.services.LLM.validate_identity import LLMService
from app.services.identity_extraction.validation import IdentityValidation

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


@dataclass(frozen=True)
class LLMIdentityReview:
    available: bool
    provider: str
    identity: dict[str, Any]
    rejected: list[dict[str, Any]]
    reason: str


class LLMIdentityVerifier:
    def __init__(self) -> None:
        if load_dotenv is not None:
            load_dotenv(Path(__file__).resolve().parents[2] / ".env")
        self.provider = (
            os.getenv("TALENTFLOW_IDENTITY_LLM_PROVIDER")
            or os.getenv("TALENTFLOW_SKILL_LLM_PROVIDER")
            or ""
        ).strip().casefold()
        self.validation = IdentityValidation()

    @property
    def available(self) -> bool:
        return self.provider in {"ollama", "qwen", "qwen3", "local", "local_qwen", "gemini", "gemini_flash", "deepseek"}

    def review_resume_identity(self, text: str, identity: dict[str, Any],
                                db: Session | None = None, recruiter_id: int | None = None) -> LLMIdentityReview:
        print("verfiying")
        if not self.available:
            return LLMIdentityReview(False, self.provider or "none", {}, [], "llm_fallback_not_configured")

        try:
            payload = LLMService.validate(text, identity, db=db, recruiter_id=recruiter_id)
            print("validating sorted")
        except Exception as exc:
            print("validating excepted")
            return LLMIdentityReview(True, self.provider, {}, [], f"llm_error:{exc}")

        reviewed = self._sanitize_payload(text, payload)
        rejected = [item for item in payload.get("rejected", []) if isinstance(item, dict)]
        return LLMIdentityReview(True, self.provider, reviewed, rejected, "identity_reviewed_by_llm")

    def _sanitize_payload(self, text: str, payload: dict[str, Any]) -> dict[str, Any]:
        name_payload = payload.get("name", {})
        email_payload = payload.get("email", {})
        phone_payload = payload.get("phone", {})
        text_key = text.casefold()

        name_value = str(name_payload.get("full_name", "")).strip() if isinstance(name_payload, dict) else ""
        email_value = str(email_payload.get("value", "")).strip() if isinstance(email_payload, dict) else ""
        phone_value = str(phone_payload.get("value", "")).strip() if isinstance(phone_payload, dict) else ""

        if name_value and name_value.casefold() not in text_key:
            name_value = ""
        if email_value and not self.validation.validate_email(email_value):
            email_value = ""
        if email_value and email_value.casefold() not in text_key:
            email_value = ""
        if phone_value and not self.validation.validate_phone(phone_value):
            phone_value = ""
        if phone_value and not self._phone_digits_present(phone_value, text):
            phone_value = ""

        if email_value:
            email_value = self.validation.normalize_email(email_value)
        if phone_value:
            phone_value = self.validation.normalize_phone(phone_value, text)

        return {
            "name": {
                "full_name": name_value,
                "confidence": self._confidence(name_payload.get("confidence", 0.0) if isinstance(name_payload, dict) else 0.0),
                "score": self._score(name_payload.get("score", 0) if isinstance(name_payload, dict) else 0),
                "evidence": self._evidence(name_payload.get("evidence", "") if isinstance(name_payload, dict) else ""),
            },
            "email": {
                "value": email_value,
                "confidence": self._confidence(email_payload.get("confidence", 0.0) if isinstance(email_payload, dict) else 0.0),
                "evidence": self._evidence(email_payload.get("evidence", "") if isinstance(email_payload, dict) else ""),
            },
            "phone": {
                "value": phone_value,
                "confidence": self._confidence(phone_payload.get("confidence", 0.0) if isinstance(phone_payload, dict) else 0.0),
                "evidence": self._evidence(phone_payload.get("evidence", "") if isinstance(phone_payload, dict) else ""),
            },
        }

    @staticmethod
    def _phone_digits_present(phone_value: str, text: str) -> bool:
        candidate_digits = IdentityValidation._digits_only(phone_value)
        if not candidate_digits:
            return False
        text_digits = IdentityValidation._digits_only(text)
        if candidate_digits in text_digits:
            return True
        if candidate_digits.startswith("212") and candidate_digits[3:] in text_digits:
            return True
        if candidate_digits.startswith("1") and candidate_digits[1:] in text_digits:
            return True
        return False

    @staticmethod
    def _confidence(value: object) -> float:
        try:
            confidence = float(value)
        except (TypeError, ValueError):
            confidence = 0.0
        return round(max(0.0, min(1.0, confidence)), 4)

    @staticmethod
    def _score(value: object) -> int:
        try:
            score = int(value)
        except (TypeError, ValueError):
            score = 0
        return max(0, score)

    @staticmethod
    def _evidence(value: object) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        evidence = str(value).strip()
        return [evidence] if evidence else []
