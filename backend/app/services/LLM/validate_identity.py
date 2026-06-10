from __future__ import annotations

import json
import os
from typing import Any

import requests


class LLMService:
    DEFAULT_ENDPOINT = "http://localhost:11434/api/generate"
    DEFAULT_MODEL = "qwen3:8b"

    @classmethod
    def endpoint(cls) -> str:
        return (
            os.getenv("TALENTFLOW_IDENTITY_LLM_ENDPOINT")
            or os.getenv("TALENTFLOW_SKILL_LLM_ENDPOINT")
            or cls.DEFAULT_ENDPOINT
        ).strip() or cls.DEFAULT_ENDPOINT

    @classmethod
    def model(cls) -> str:
        return (
            os.getenv("TALENTFLOW_IDENTITY_LLM_MODEL")
            or os.getenv("TALENTFLOW_SKILL_LLM_MODEL")
            or cls.DEFAULT_MODEL
        ).strip() or cls.DEFAULT_MODEL

    @classmethod
    def validate(cls, text: str, identity: dict[str, Any]) -> dict[str, Any]:
        print("validating entereddd")
        prompt = cls._build_identity_review_prompt(text, identity)
        print("calling ollama...")
        response = requests.post(
            cls.endpoint(),
            json={
                "model": cls.model(),
                "prompt": prompt,
                "think": False,
                "stream": False,
                "options": {
                    "temperature": float(
                        os.getenv(
                            "TALENTFLOW_IDENTITY_LLM_TEMPERATURE",
                            os.getenv("TALENTFLOW_SKILL_LLM_TEMPERATURE", "0.1"),
                        )
                    ),
                    "top_p": float(
                        os.getenv(
                            "TALENTFLOW_IDENTITY_LLM_TOP_P",
                            os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8"),
                        )
                    ),
                    "num_predict": int(
                        os.getenv(
                            "TALENTFLOW_IDENTITY_LLM_NUM_PREDICT",
                            os.getenv("TALENTFLOW_SKILL_LLM_NUM_PREDICT", "2048"),
                        )
                    ),
                },
            },
            timeout=float(
                os.getenv(
                    "TALENTFLOW_IDENTITY_LLM_TIMEOUT",
                    os.getenv("TALENTFLOW_SKILL_LLM_TIMEOUT", "300"),
                )
            ),
        )
        response.raise_for_status()
        payload = response.json()
        return cls._parse_json_response(str(payload.get("response", "")))

    @staticmethod
    def _build_identity_review_prompt(text: str, identity: dict[str, Any]) -> str:
        print("build entered")
        serialized_identity = json.dumps(identity, ensure_ascii=False)
        print("json v-identity")
        print(serialized_identity)
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
            "No markdown. No explanations.\n"

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
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start < 0 or end <= start:
                raise
            parsed = json.loads(cleaned[start : end + 1])

        if not isinstance(parsed, dict):
            raise ValueError("LLM response must be a JSON object")

        for field in ("name", "email", "phone"):
            if not isinstance(parsed.get(field), dict):
                parsed[field] = {}
        if not isinstance(parsed.get("rejected"), list):
            parsed["rejected"] = []
        return parsed
