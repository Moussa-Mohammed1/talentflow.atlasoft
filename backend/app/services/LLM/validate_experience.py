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
            os.getenv("TALENTFLOW_EXPERIENCE_LLM_ENDPOINT")
            or os.getenv("TALENTFLOW_SKILL_LLM_ENDPOINT")
            or cls.DEFAULT_ENDPOINT
        ).strip() or cls.DEFAULT_ENDPOINT
        if not api_key:
            raise ValueError("LLM_API_KEY is not set in .env")
        return OpenAI(api_key=api_key, base_url=endpoint)

    @classmethod
    def model(cls) -> str:
        return (
            os.getenv("TALENTFLOW_EXPERIENCE_LLM_MODEL")
            or os.getenv("TALENTFLOW_SKILL_LLM_MODEL")
            or cls.DEFAULT_MODEL
        ).strip() or cls.DEFAULT_MODEL

    @classmethod
    def validate(cls, text: str, experiences: list[dict[str, Any]]) -> dict[str, Any]:
        prompt = cls._build_experience_review_prompt(text, experiences)
        print("calling deepseek...", flush=True)
        response = cls._client().chat.completions.create(
            model=cls.model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=float(
                os.getenv(
                    "TALENTFLOW_EXPERIENCE_LLM_TEMPERATURE",
                    os.getenv("TALENTFLOW_SKILL_LLM_TEMPERATURE", "0.1"),
                )
            ),
            top_p=float(
                os.getenv(
                    "TALENTFLOW_EXPERIENCE_LLM_TOP_P",
                    os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8"),
                )
            ),
            max_tokens=int(
                os.getenv(
                    "TALENTFLOW_EXPERIENCE_LLM_NUM_PREDICT",
                    os.getenv("TALENTFLOW_SKILL_LLM_NUM_PREDICT", "4096"),
                )
            ),
        )
        content = response.choices[0].message.content or ""
        print("printing result...", flush=True)
        print(content, flush=True)
        return cls._parse_json_response(content)

    @staticmethod
    def _build_experience_review_prompt(text: str, experiences: list[dict[str, Any]]) -> str:
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
            "Professional experience means paid employment or internships at companies/organizations.\n"
            "Review every candidate exactly once using its candidate_index.\n"
            "Then scan the professional experience section for missing employment records.\n"
            "For each missing record, add one item with candidate_index set to null and action corrected.\n"
            "Accept records that are genuine professional employment supported by the resume.\n"
            "Correct records that are employment but have minor field errors.\n\n"
            "You MUST reject with action 'rejected':\n"
            "- Education entries (schools, universities, training programs, bootcamps)\n"
            "- Personal projects, side projects, or academic projects\n"
            "- Certifications or courses\n"
            "- Invented or unsupported employment\n"
            "- Volunteer work without a formal employer\n\n"
            "Signs a candidate is EDUCATION not employment:\n"
            "- Institution name is a school, university, faculty, or training center\n"
            "- Title contains 'degree', 'diploma', 'baccalaureat', 'licence', 'master', 'deug', 'bts'\n"
            "- Description mentions field of study rather than job responsibilities\n"
            "- Section context is FORMATION, EDUCATION, or STUDIES\n\n"
            "Signs a candidate is a PROJECT not employment:\n"
            "- Title is a project name, not a job title\n"
            "- Description describes building an application or tool\n"
            "- Section context is PROJETS, PROJECTS, or REALISATIONS\n"
            "- No employer or company name is present\n\n"
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
        print(cleaned)
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
            parsed = {"experiences": parsed, "rejected": []}

        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object or array, got {type(parsed)}")

        parsed.setdefault("experiences", [])
        parsed.setdefault("rejected", [])

        if not isinstance(parsed["experiences"], list):
            parsed["experiences"] = []
        if not isinstance(parsed["rejected"], list):
            parsed["rejected"] = []

        parsed["experiences"] = [
            item for item in parsed["experiences"]
            if isinstance(item, dict) and str(item.get("title", "")).strip()
        ]
        parsed["rejected"] = [
            item for item in parsed["rejected"]
            if isinstance(item, dict) and str(item.get("name", "")).strip()
        ]

        print(
            f"\n\nLLM review: "
            f"{len(parsed['experiences'])} accepted, "
            f"{len(parsed['rejected'])} rejected",
            flush=True,
        )

        return parsed
