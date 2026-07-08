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
        if not api_key:
            raise ValueError("LLM_API_KEY is not set in .env")
        return OpenAI(api_key=api_key, base_url=cls.DEFAULT_ENDPOINT)

    @classmethod
    def model(cls) -> str:
        return os.getenv("LLM_MODEL", cls.DEFAULT_MODEL).strip() or cls.DEFAULT_MODEL

    @classmethod
    def validate(cls, description: str,
                 db: Session | None = None, recruiter_id: int | None = None) -> dict[str, Any]:
        prompt = cls._build_job_offer_prompt(description)
        print("calling deepseek for job offer generation...", flush=True)
        start = datetime.utcnow()
        response = cls._client().chat.completions.create(
            model=cls.model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=float(os.getenv("TALENTFLOW_SKILL_LLM_TEMPERATURE", "0.1")),
            top_p=float(os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8")),
            max_tokens=int(os.getenv("TALENTFLOW_SKILL_LLM_NUM_PREDICT", "4096")),
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
                    action="job_offer_generation",
                    model=cls.model(),
                    tokens_prompt=response.usage.prompt_tokens if response.usage else 0,
                    tokens_completion=response.usage.completion_tokens if response.usage else 0,
                    duration_ms=duration,
                )
            except Exception:
                pass
        return cls._parse_json_response(content)

    @staticmethod
    def _build_job_offer_prompt(description: str) -> str:
        schema = {
            "title": "job title",
            "description": "full job description cleaned and formatted",
            "responsibilities": "key responsibilities as a bullet-point string or null",
            "employment_type": "full_time | part_time | internship | contract | freelance",
            "work_mode": "on_site | hybrid | remote",
            "seniority_level": "junior | mid | senior | lead",
            "openings": 1,
        }
        return (
            "You are an expert ATS job offer generator.\n"
            "Your task is to parse a raw job description and extract structured fields.\n\n"

            "Rules:\n"
            "- Infer the most appropriate values from the description.\n"
            "- If a field cannot be determined, use sensible defaults.\n"
            "- The employment_type must be one of: full_time, part_time, internship, contract, freelance.\n"
            "- The work_mode must be one of: on_site, hybrid, remote.\n"
            "- The seniority_level must be one of: junior, mid, senior, lead.\n"
            "- openings must be a positive integer (default 1).\n"
            "- Clean and reformat the description text (remove typos, normalize whitespace).\n"
            "- responsibilities should be a concise bullet-point string or null.\n\n"

            "Return only one valid JSON object. No markdown and no explanation outside JSON.\n\n"
            "JSON schema:\n"
            f"{json.dumps(schema, ensure_ascii=False, indent=2)}\n\n"
            "Job description:\n"
            f"{description}"
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
            parsed = parsed[0] if parsed else {}

        if not isinstance(parsed, dict):
            raise ValueError(
                f"LLM response must be a JSON object, got {type(parsed)}"
            )

        parsed.setdefault("title", "Untitled Position")
        parsed.setdefault("description", None)
        parsed.setdefault("responsibilities", None)
        parsed.setdefault("employment_type", "full_time")
        parsed.setdefault("work_mode", "on_site")
        parsed.setdefault("seniority_level", "mid")
        parsed.setdefault("openings", 1)

        print(
            f"\n\nLLM job offer: "
            f"title={parsed['title']}, "
            f"type={parsed['employment_type']}, "
            f"mode={parsed['work_mode']}, "
            f"level={parsed['seniority_level']}",
            flush=True,
        )

        return parsed
