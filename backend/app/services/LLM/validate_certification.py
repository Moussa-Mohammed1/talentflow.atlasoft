from __future__ import annotations

import json
import os
from typing import Any

from openai import OpenAI


class LLMService:
    DEFAULT_MODEL = "deepseek-chat"
    DEFAULT_ENDPOINT = "https://api.deepseek.com/v1"

    @classmethod
    def _client(cls) -> OpenAI:
        api_key = os.getenv("LLM_API_KEY", "").strip()
        endpoint = (
            os.getenv("TALENTFLOW_CERTIFICATION_LLM_ENDPOINT")
            or os.getenv("TALENTFLOW_EXPERIENCE_LLM_ENDPOINT")
            or os.getenv("TALENTFLOW_SKILL_LLM_ENDPOINT")
            or cls.DEFAULT_ENDPOINT
        ).strip() or cls.DEFAULT_ENDPOINT
        if not api_key:
            raise ValueError("LLM_API_KEY is not set in .env")
        return OpenAI(api_key=api_key, base_url=endpoint)

    @classmethod
    def model(cls) -> str:
        return (
            os.getenv("TALENTFLOW_CERTIFICATION_LLM_MODEL")
            or os.getenv("TALENTFLOW_EXPERIENCE_LLM_MODEL")
            or os.getenv("TALENTFLOW_SKILL_LLM_MODEL")
            or cls.DEFAULT_MODEL
        ).strip() or cls.DEFAULT_MODEL

    @classmethod
    def validate(cls, text: str, certifications: list[dict[str, Any]]) -> dict[str, Any]:
        prompt = cls._build_certification_review_prompt(text, certifications)
        print("calling deepseek...", flush=True)
        response = cls._client().chat.completions.create(
            model=cls.model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=float(
                os.getenv(
                    "TALENTFLOW_CERTIFICATION_LLM_TEMPERATURE",
                    os.getenv("TALENTFLOW_SKILL_LLM_TEMPERATURE", "0.1"),
                )
            ),
            top_p=float(
                os.getenv(
                    "TALENTFLOW_CERTIFICATION_LLM_TOP_P",
                    os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8"),
                )
            ),
            max_tokens=int(
                os.getenv(
                    "TALENTFLOW_CERTIFICATION_LLM_NUM_PREDICT",
                    os.getenv("TALENTFLOW_SKILL_LLM_NUM_PREDICT", "4096"),
                )
            ),
        )
        content = response.choices[0].message.content or ""
        print("printing result...", flush=True)
        print(content, flush=True)
        return cls._parse_json_response(content)

    @staticmethod
    def _build_certification_review_prompt(text: str, certifications: list[dict[str, Any]]) -> str:
        schema = {
            "certifications": [
                {
                    "candidate_index": 0,
                    "action": "accepted | corrected | rejected",
                    "name": "certification name exactly as supported by the resume",
                    "organization": "issuing organization or null",
                    "issue_date": "YYYY-MM-DD or null",
                    "expiration_date": "YYYY-MM-DD or null",
                    "credential_id": "credential id or null",
                    "credential_url": "credential url or null",
                    "confidence": 0.0,
                    "reason": "short verification reason",
                    "evidence": ["exact supporting lines from the resume"],
                }
            ]
        }
        return (
            "You verify certification entries extracted from a French or English resume.\n"
            "Review every candidate exactly once using its candidate_index.\n"
            "For each missing certification record, add one item with candidate_index set to null and action corrected.\n"
            "Accept records supported by the resume, correct only fields explicitly supported by the text, "
            "and reject entries that are not certifications.\n"
            "Never invent a numeric candidate_index that was not supplied. Never infer missing dates or details.\n"
            "Every corrected or newly added record must include exact resume lines in evidence.\n"
            "Return only one valid JSON object. No markdown and no explanation outside JSON.\n\n"
            "JSON schema:\n"
            f"{json.dumps(schema, ensure_ascii=False, indent=2)}\n\n"
            "Extracted candidates:\n"
            f"{json.dumps(certifications, ensure_ascii=False, default=str)}\n\n"
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
            parsed = {"certifications": parsed, "rejected": []}

        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object or array, got {type(parsed)}")

        parsed.setdefault("certifications", [])
        parsed.setdefault("rejected", [])

        if not isinstance(parsed["certifications"], list):
            parsed["certifications"] = []
        if not isinstance(parsed["rejected"], list):
            parsed["rejected"] = []

        parsed["certifications"] = [
            item for item in parsed["certifications"]
            if isinstance(item, dict) and str(item.get("name", "")).strip()
        ]
        parsed["rejected"] = [
            item for item in parsed["rejected"]
            if isinstance(item, dict) and str(item.get("name", "")).strip()
        ]

        print(
            f"\n\nLLM review: "
            f"{len(parsed['certifications'])} accepted, "
            f"{len(parsed['rejected'])} rejected",
            flush=True,
        )

        return parsed
