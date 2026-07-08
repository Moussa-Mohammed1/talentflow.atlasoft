from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any

from openai import OpenAI
from sqlalchemy.orm import Session

from app.services.llm_usage_recorder import record_llm_usage


class LLMService:
    DEFAULT_MODEL = "deepseek-chat"
    DEFAULT_ENDPOINT = "https://api.deepseek.com/v1"

    @classmethod
    def _client(cls) -> OpenAI:
        api_key = os.getenv("LLM_API_KEY", "").strip()
        endpoint = (
            os.getenv("TALENTFLOW_IDENTITY_LLM_ENDPOINT")
            or os.getenv("TALENTFLOW_SKILL_LLM_ENDPOINT")
            or cls.DEFAULT_ENDPOINT
        ).strip() or cls.DEFAULT_ENDPOINT
        if not api_key:
            raise ValueError("LLM_API_KEY is not set in .env")
        return OpenAI(api_key=api_key, base_url=endpoint)

    @classmethod
    def model(cls) -> str:
        return (
            os.getenv("TALENTFLOW_IDENTITY_LLM_MODEL")
            or os.getenv("TALENTFLOW_SKILL_LLM_MODEL")
            or cls.DEFAULT_MODEL
        ).strip() or cls.DEFAULT_MODEL

    @classmethod
    def validate(cls, text: str, identity: dict[str, Any],
                 db: Session | None = None, recruiter_id: int | None = None) -> dict[str, Any]:
        prompt = cls._build_identity_review_prompt(text, identity)
        print("calling deepseek...", flush=True)
        start = datetime.utcnow()
        response = cls._client().chat.completions.create(
            model=cls.model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=float(
                os.getenv(
                    "TALENTFLOW_IDENTITY_LLM_TEMPERATURE",
                    os.getenv("TALENTFLOW_SKILL_LLM_TEMPERATURE", "0.1"),
                )
            ),
            top_p=float(
                os.getenv(
                    "TALENTFLOW_IDENTITY_LLM_TOP_P",
                    os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8"),
                )
            ),
            max_tokens=int(
                os.getenv(
                    "TALENTFLOW_IDENTITY_LLM_NUM_PREDICT",
                    os.getenv("TALENTFLOW_SKILL_LLM_NUM_PREDICT", "4096"),
                )
            ),
        )
        duration = int((datetime.utcnow() - start).total_seconds() * 1000)
        content = response.choices[0].message.content or ""
        print("printing result...", flush=True)
        print(content, flush=True)
        if db is not None and recruiter_id is not None:
            try:
                record_llm_usage(
                    db=db,
                    recruiter_id=recruiter_id,
                    action="identity_validation",
                    model=cls.model(),
                    tokens_prompt=response.usage.prompt_tokens if response.usage else 0,
                    tokens_completion=response.usage.completion_tokens if response.usage else 0,
                    duration_ms=duration,
                )
            except Exception:
                pass
        return cls._parse_json_response(content)

    @staticmethod
    def _build_identity_review_prompt(text: str, identity: dict[str, Any]) -> str:
        serialized_identity = json.dumps(identity, ensure_ascii=False)
        schema = {
            "name": {
                "full_name": "",
                "confidence": 0.0,
                "score": 0,
                "evidence": "",
                "action": "accepted | corrected | rejected | missing"
            },
            "email": {
                "value": "",
                "confidence": 0.0,
                "evidence": "",
                "action": "accepted | corrected | rejected | missing"
            },
            "phone": {
                "value": "",
                "confidence": 0.0,
                "evidence": "",
                "action": "accepted | corrected | rejected | missing"
            },
            "rejected": [
                {
                "field": "name | email | phone",
                "value": "",
                "reason": ""
                }
            ]
        }
        return (
            "You validate identity information extracted from a French or English resume.\n"
            "Return ONLY one valid JSON object matching this schema.\n"
            "No markdown. No explanations.\n\n"
            f"{json.dumps(schema, indent=2)}\n\n"
            "Extracted identity:\n"
            f"{serialized_identity}\n\n"
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
            parsed = None
            obj_start = cleaned.find("{")
            obj_end = cleaned.rfind("}")
            if obj_start >= 0 and obj_end > obj_start:
                try:
                    parsed = json.loads(cleaned[obj_start : obj_end + 1])
                except json.JSONDecodeError:
                    pass
            if parsed is None:
                arr_start = cleaned.find("[")
                arr_end = cleaned.rfind("]")
                if arr_start >= 0 and arr_end > arr_start:
                    parsed = json.loads(cleaned[arr_start : arr_end + 1])
                else:
                    raise

        if isinstance(parsed, list):
            parsed = {"rejected": []}

        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object or array, got {type(parsed)}")

        for field in ("name", "email", "phone"):
            if not isinstance(parsed.get(field), dict):
                parsed[field] = {}
        if not isinstance(parsed.get("rejected"), list):
            parsed["rejected"] = []

        parsed["rejected"] = [
            item for item in parsed["rejected"]
            if isinstance(item, dict) and str(item.get("field", "")).strip()
        ]

        print(
            f"\n\nLLM review: "
            f"fields accepted, "
            f"{len(parsed['rejected'])} rejected",
            flush=True,
        )

        return parsed
