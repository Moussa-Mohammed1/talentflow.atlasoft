from __future__ import annotations

import json
import logging
import os
from typing import Any

import requests

from app.services.language_extraction.models import LanguageMention, LanguageProficiency

logger = logging.getLogger(__name__)


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
    DEFAULT_ENDPOINT = "http://localhost:11434/api/generate"
    DEFAULT_MODEL = "qwen3:8b"

    @classmethod
    def endpoint(cls) -> str:
        return (
            os.getenv("TALENTFLOW_LANGUAGE_LLM_ENDPOINT")
            or os.getenv("TALENTFLOW_SKILL_LLM_ENDPOINT")
            or cls.DEFAULT_ENDPOINT
        ).strip() or cls.DEFAULT_ENDPOINT

    @classmethod
    def model(cls) -> str:
        return (
            os.getenv("TALENTFLOW_LANGUAGE_LLM_MODEL")
            or os.getenv("TALENTFLOW_SKILL_LLM_MODEL")
            or cls.DEFAULT_MODEL
        ).strip() or cls.DEFAULT_MODEL

    @property
    def available(self) -> bool:
        try:
            return bool(self.endpoint() and self.model())
        except Exception:
            return False

    def review(self, text: str, languages: list[LanguageMention]) -> LLMReviewResult:
        if not self.available:
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
            response_data = self._call_llm(text, payload)
            return self._parse_response(response_data, payload)
        except Exception:
            logger.exception("Language LLM verification failed, falling back to deterministic results")
            return LLMReviewResult(
                available=True,
                languages=[lang.to_dict() for lang in languages],
                rejected=[],
                provider=self.model(),
                reason="LLM call failed, used deterministic extraction",
            )

    def _call_llm(self, text: str, languages: list[dict[str, Any]]) -> dict[str, Any]:
        prompt = self._build_prompt(text, languages)
        logger.info(
            "Language LLM request started: model=%s candidates=%d",
            self.model(),
            len(languages),
        )
        response = requests.post(
            self.endpoint(),
            json={
                "model": self.model(),
                "prompt": "/no_think\n" + prompt,
                "stream": False,
                "think": False,
                "options": {
                    "temperature": float(os.getenv("TALENTFLOW_LANGUAGE_LLM_TEMPERATURE", "0.1")),
                    "top_p": float(os.getenv("TALENTFLOW_LANGUAGE_LLM_TOP_P", "0.8")),
                    "num_predict": int(os.getenv("TALENTFLOW_LANGUAGE_LLM_NUM_PREDICT", "2048")),
                },
            },
            timeout=float(os.getenv("TALENTFLOW_LANGUAGE_LLM_TIMEOUT", "120")),
        )
        response.raise_for_status()
        payload = response.json()
        parsed = self._parse_json_response(str(payload.get("response", "")))
        logger.info(
            "Language LLM request completed: decisions=%d",
            len(parsed.get("languages", [])),
        )
        return parsed

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
    def _parse_response(lm_response: dict[str, Any], original_payload: list[dict[str, Any]]) -> LLMReviewResult:
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
            provider=LLMLanguageVerifier.model(),
        )

    @staticmethod
    def _parse_json_response(raw_response: str) -> dict[str, Any]:
        cleaned = raw_response.strip()
        if "</think>" in cleaned:
            cleaned = cleaned.split("</think>", 1)[1].strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.removeprefix("```").strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3].strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start < 0 or end <= start:
                raise
            parsed = json.loads(cleaned[start : end + 1])

        if not isinstance(parsed, dict):
            raise ValueError("LLM response must be a JSON object")
        parsed.setdefault("languages", [])
        parsed.setdefault("rejected", [])
        if not isinstance(parsed["languages"], list):
            parsed["languages"] = []
        if not isinstance(parsed["rejected"], list):
            parsed["rejected"] = []

        parsed["languages"] = [
            item for item in parsed["languages"]
            if isinstance(item, dict) and str(item.get("language", "")).strip()
        ]
        parsed["rejected"] = [
            item for item in parsed["rejected"]
            if isinstance(item, dict) and str(item.get("language", "")).strip()
        ]

        return parsed
