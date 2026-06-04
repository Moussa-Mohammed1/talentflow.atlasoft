from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from backend.app.services.LLM.validate_skills import LLMService

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


@dataclass(frozen=True)
class LLMVerification:
    accepted: bool
    confidence: float
    reason: str
    provider: str


@dataclass(frozen=True)
class LLMReview:
    available: bool
    provider: str
    accepted_skills: list[dict[str, Any]]
    rejected_skills: list[dict[str, Any]]
    reason: str


class LLMSkillVerifier:
    def __init__(self) -> None:
        if load_dotenv is not None:
            load_dotenv(Path(__file__).resolve().parents[2] / ".env")
        self.provider = os.getenv("TALENTFLOW_SKILL_LLM_PROVIDER", "").strip().casefold()

    @property
    def available(self) -> bool:
        return self.provider in {"ollama", "qwen", "qwen3", "local", "local_qwen"}

    def verify(self, candidate: str, evidence: list[str], section: str) -> LLMVerification:
        if not self.available:
            return LLMVerification(False, 0.0, "llm_fallback_not_configured", "none")

        if os.getenv("TALENTFLOW_SKILL_LLM_CANDIDATE_VERIFY", "").strip().casefold() not in {"1", "true", "yes"}:
            return LLMVerification(False, 0.0, "candidate_level_llm_verify_disabled", self.provider)

        prompt_text = "\n".join(evidence)
        try:
            payload = LLMService.validate(prompt_text, [{"name": candidate, "section": section, "evidence": evidence}])
        except Exception as exc:
            return LLMVerification(False, 0.0, f"llm_error:{exc}", self.provider)

        names = {str(item.get("name", "")).strip().casefold() for item in payload.get("skills", []) if isinstance(item, dict)}
        accepted = candidate.casefold() in names
        confidence = 0.7 if accepted else 0.0
        return LLMVerification(accepted, confidence, "candidate_reviewed_by_llm", self.provider)

    def review_resume_skills(self, text: str, skills: list[dict[str, Any]]) -> LLMReview:
        if not self.available:
            return LLMReview(False, self.provider or "none", [], [], "llm_fallback_not_configured")

        try:
            payload = LLMService.validate(text, skills)
        except Exception as exc:
            return LLMReview(True, self.provider, [], [], f"llm_error:{exc}")

        accepted = [item for item in payload.get("skills", []) if isinstance(item, dict)]
        rejected = [item for item in payload.get("rejected", []) if isinstance(item, dict)]
        return LLMReview(True, self.provider, accepted, rejected, "resume_reviewed_by_llm")
