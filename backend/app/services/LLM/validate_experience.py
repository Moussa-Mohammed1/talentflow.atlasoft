from __future__ import annotations

import json
import logging
import os
from typing import Any

import requests


logger = logging.getLogger(__name__)


class LLMService:
    DEFAULT_ENDPOINT = "http://localhost:11434/api/generate"
    DEFAULT_MODEL = "qwen3:8b"

    @classmethod
    def endpoint(cls) -> str:
        return (
            os.getenv("TALENTFLOW_EXPERIENCE_LLM_ENDPOINT")
            or os.getenv("TALENTFLOW_SKILL_LLM_ENDPOINT")
            or cls.DEFAULT_ENDPOINT
        ).strip() or cls.DEFAULT_ENDPOINT

    @classmethod
    def model(cls) -> str:
        return (
            os.getenv("TALENTFLOW_EXPERIENCE_LLM_MODEL")
            or os.getenv("TALENTFLOW_SKILL_LLM_MODEL")
            or cls.DEFAULT_MODEL
        ).strip() or cls.DEFAULT_MODEL

    @classmethod
    def validate(cls, text: str, experiences: list[dict[str, Any]]) -> dict[str, Any]:
        logger.info(
            "Experience LLM request started: model=%s candidates=%d",
            cls.model(),
            len(experiences),
        )
        print(f"=== EXPERIENCE LLM REQUEST: model={cls.model()} candidates={len(experiences)} ===", flush=True)
        response = requests.post(
            cls.endpoint(),
            json={
                "model": cls.model(),
                "prompt": "/no_think\n" + cls._build_prompt(text, experiences),
                "stream": False,
                "think": False,
                "options": {
                    "temperature": float(
                        os.getenv(
                            "TALENTFLOW_EXPERIENCE_LLM_TEMPERATURE",
                            os.getenv("TALENTFLOW_SKILL_LLM_TEMPERATURE", "0.1"),
                        )
                    ),
                    "top_p": float(
                        os.getenv(
                            "TALENTFLOW_EXPERIENCE_LLM_TOP_P",
                            os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8"),
                        )
                    ),
                    "num_predict": int(
                        os.getenv(
                            "TALENTFLOW_EXPERIENCE_LLM_NUM_PREDICT",
                            os.getenv("TALENTFLOW_SKILL_LLM_NUM_PREDICT", "2048"),
                        )
                    ),
                },
            },
            timeout=float(
                os.getenv(
                    "TALENTFLOW_EXPERIENCE_LLM_TIMEOUT",
                    os.getenv("TALENTFLOW_SKILL_LLM_TIMEOUT", "300"),
                )
            ),
        )
        response.raise_for_status()
        payload = response.json()
        parsed = cls._parse_json_response(str(payload.get("response", "")))
        logger.info(
            "Experience LLM request completed: decisions=%d",
            len(parsed.get("experiences", [])),
        )
        print(
            f"=== EXPERIENCE LLM RESPONSE: decisions={len(parsed.get('experiences', []))} ===",
            flush=True,
        )
        return parsed

    @staticmethod
    def _build_prompt(text: str, experiences: list[dict[str, Any]]) -> str:
        schema = {
            "experiences": [
                {
                    "candidate_index": 0,
                    "action": "accepted | corrected | rejected",
                    "title": "job title and employer exactly as supported by the resume",
                    "description": "responsibilities exactly supported by the resume or null",
                    "start_date": "YYYY-MM-DD",
                    "end_date": "YYYY-MM-DD or null for a current role",
                    "confidence": 0.0,
                    "reason": "short verification reason",
                    "evidence": ["exact supporting lines from the resume"],
                }
            ]
        }
        return (
            "You verify professional experience extracted from a French or English resume.\n"
            "Review every candidate exactly once using its candidate_index.\n"
            "Then scan the professional experience section for missing employment records.\n"
            "For each missing record, add one item with candidate_index set to null and action corrected.\n"
            "Accept records supported by the resume, correct only fields explicitly supported by the text, "
            "and reject projects, certifications, or invented employment.\n"
            "Never invent a numeric candidate_index that was not supplied. Never infer missing dates or duties.\n"
            "Every corrected or newly added record must include exact resume lines in evidence.\n"
            "Use null end_date for Present, Current, aujourd'hui, actuel, or en cours.\n"
            "Return only one valid JSON object. No markdown and no explanation outside JSON.\n\n"
            "JSON schema:\n"
            f"{json.dumps(schema, ensure_ascii=False, indent=2)}\n\n"
            "Extracted candidates:\n"
            f"{json.dumps(experiences, ensure_ascii=False, default=str)}\n\n"
            "Resume text:\n"
            f"{text}"
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
            parsed = json.loads(cleaned[start:end + 1])

        if not isinstance(parsed, dict):
            raise ValueError("LLM response must be a JSON object")
        experiences = parsed.get("experiences", [])
        if not isinstance(experiences, list):
            raise ValueError("LLM response experiences must be a list")
        parsed["experiences"] = [item for item in experiences if isinstance(item, dict)]
        return parsed
