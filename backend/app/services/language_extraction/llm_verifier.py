from __future__ import annotations

import json
import logging
import os
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.language_extraction.models import LanguageMention
from app.services.llm_router import LLMRouterService, parse_json_payload

logger = logging.getLogger(__name__)


class _LanguageValidationResponse(BaseModel):
    languages: list[dict[str, Any]] = Field(default_factory=list)
    rejected: list[dict[str, Any]] = Field(default_factory=list)


class LLMReviewResult:
    def __init__(
        self,
        available: bool,
        languages: list[dict[str, Any]],
        rejected: list[dict[str, Any]],
        provider: str = "",
        reason: str = "",
    ) -> None:
        self.available = available
        self.languages = languages
        self.rejected = rejected
        self.provider = provider
        self.reason = reason


class LLMLanguageVerifier:
    def __init__(self, db: Session | None = None, recruiter_id: int | None = None) -> None:
        self.db = db
        self.recruiter_id = recruiter_id

    @property
    def available(self) -> bool:
        return LLMRouterService.is_task_configured("cv_extraction", db=self.db)

    def review(
        self,
        text: str,
        languages: list[LanguageMention],
        db: Session | None = None,
        recruiter_id: int | None = None,
    ) -> LLMReviewResult:
        effective_db = db if db is not None else self.db
        effective_recruiter_id = recruiter_id if recruiter_id is not None else self.recruiter_id

        if not LLMRouterService.is_task_configured("cv_extraction", db=effective_db):
            return LLMReviewResult(
                available=False,
                languages=[lang.to_dict() for lang in languages],
                rejected=[],
                reason="LLM not configured",
            )

        payload = [
            {
                "language": lang.language,
                "proficiency": lang.proficiency.to_dict() if lang.proficiency else None,
                "confidence": lang.confidence,
                "evidence": lang.evidence[:3],
            }
            for lang in languages
        ]

        try:
            prompt = self._build_prompt(text, payload)
            result = LLMRouterService.generate(
                task_category="cv_extraction",
                prompt=prompt,
                action="language_validation",
                db=effective_db,
                recruiter_id=effective_recruiter_id,
                json_mode=True,
                top_p=float(os.getenv("TALENTFLOW_LANGUAGE_LLM_TOP_P", "0.8")),
                validator=self._parse_json_response,
            )
            return self._parse_response(result.parsed, provider=f"{result.provider}:{result.model}")
        except Exception:
            logger.exception("Language LLM verification failed, falling back to deterministic results")
            return LLMReviewResult(
                available=True,
                languages=[lang.to_dict() for lang in languages],
                rejected=[],
                provider=LLMRouterService.resolve_task_profile("cv_extraction", db=effective_db).primary_provider,
                reason="LLM call failed, used deterministic extraction",
            )

    @staticmethod
    def _build_prompt(text: str, languages: list[dict[str, Any]]) -> str:
        schema = {
            "languages": [
                {
                    "language": "canonical language name",
                    "proficiency": "Native | Bilingual | Fluent | Advanced | Intermediate | Elementary | Beginner | null",
                    "confidence": 0.0,
                    "evidence": ["exact supporting line from the resume"],
                    "action": "accepted | corrected | rejected",
                }
            ],
            "rejected": [
                {
                    "language": "original value",
                    "reason": "short rejection reason",
                }
            ],
        }

        return (
            "You verify language skills extracted from a French or English resume.\n"
            "Review every extracted language, accept supported ones, correct proficiency when wrong, "
            "and reject items that are not actual spoken/foreign languages (e.g., programming languages, tools).\n"
            "Then scan the entire resume for any missing spoken/foreign languages and add them.\n"
            "Report languages of the candidate: e.g. English, French, Arabic, Spanish, German.\n"
            "Only include spoken/foreign languages, NOT programming languages.\n"
            "Use null for proficiency when level is not specified.\n"
            "Return only one valid JSON object. No markdown and no explanation outside JSON.\n\n"
            "JSON schema:\n"
            f"{json.dumps(schema, ensure_ascii=False, indent=2)}\n\n"
            "Extracted languages:\n"
            f"{json.dumps(languages, ensure_ascii=False, default=str)}\n\n"
            "Resume text:\n"
            f"{text}"
        )

    @staticmethod
    def _parse_response(lm_response: dict[str, Any], *, provider: str = "") -> LLMReviewResult:
        accepted = lm_response.get("languages", [])
        rejected = lm_response.get("rejected", [])
        if not isinstance(accepted, list):
            accepted = []
        if not isinstance(rejected, list):
            rejected = []

        return LLMReviewResult(
            available=True,
            languages=accepted,
            rejected=rejected,
            provider=provider,
        )

    @staticmethod
    def _parse_json_response(raw_response: str) -> dict[str, Any]:
        parsed = parse_json_payload(raw_response)
        if not isinstance(parsed, dict):
            raise ValueError("LLM response must be a JSON object")

        validated = _LanguageValidationResponse.model_validate(
            {
                "languages": parsed.get("languages") if isinstance(parsed.get("languages"), list) else [],
                "rejected": parsed.get("rejected") if isinstance(parsed.get("rejected"), list) else [],
            }
        )
        languages = [
            item for item in validated.languages
            if isinstance(item, dict) and str(item.get("language", "")).strip()
        ]
        rejected = [
            item for item in validated.rejected
            if isinstance(item, dict) and str(item.get("language", "")).strip()
        ]
        return {"languages": languages, "rejected": rejected}
