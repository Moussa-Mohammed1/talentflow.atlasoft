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
    def finalize(
        cls,
        file_path: str,
        candidate_info: dict[str, Any],
        evaluations: list[dict[str, Any]],
        db: Session | None = None,
        recruiter_id: int | None = None,
    ) -> dict[str, Any]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            resume_text = f.read()
        prompt = cls._build_finalize_prompt(resume_text, candidate_info, evaluations)
        print("calling deepseek (final scorer)...", flush=True)
        start = datetime.utcnow()
        response = cls._client().chat.completions.create(
            model=cls.model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            top_p=0.8,
            max_tokens=4096,
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
                    action="evaluation_finalize",
                    model=cls.model(),
                    tokens_prompt=response.usage.prompt_tokens if response.usage else 0,
                    tokens_completion=response.usage.completion_tokens if response.usage else 0,
                    duration_ms=duration,
                )
            except Exception:
                pass
        return cls._parse_json_response(content)

    @staticmethod
    def _build_finalize_prompt(
        text: str,
        candidate_info: dict[str, Any],
        evaluations: list[dict[str, Any]],
    ) -> str:
        candidate_json = json.dumps(candidate_info, ensure_ascii=False, indent=2)
        evals_json = json.dumps(evaluations, ensure_ascii=False, indent=2)

        schema = {
            "evaluations": [
                {
                    "department_name": "IT",
                    "compatibility": 72.5,
                    "reason": "...",
                    "skills_score": 80.0,
                    "experience_score": 100.0,
                    "education_score": 100.0,
                    "certifications_score": 0.0,
                    "languages_score": 66.67,
                    "preferred_skills_score": 60.0,
                },
                {
                    "department_name": "RH",
                    "compatibility": 5.0,
                    "reason": "...",
                    "skills_score": 0.0,
                    "experience_score": 0.0,
                    "education_score": 0.0,
                    "certifications_score": 0.0,
                    "languages_score": 100.0,
                    "preferred_skills_score": 0.0,
                },
            ]
        }

        return (
            "You are a senior ATS evaluator. Your task is to produce the FINAL compatibility score "
            "for EACH department below. You MUST evaluate EVERY department — do not skip any.\n\n"

            "Do NOT simply copy the computed scores. Use your judgment to decide whether they are fair. "
            "Consider:\n"
            "- Whether the candidate's skills are genuinely relevant to the department's domain\n"
            "- Whether the candidate's experience truly belongs to that field — if it has nothing to do with the department or its required skills, experience_score MUST be 0\n"
            "- Whether education, certifications, and languages meaningfully contribute\n"
            "- Whether extra skills (beyond requirements) deserve a bonus\n\n"

            "Rules:\n"
            "- Return ALL departments listed below. Do not omit any.\n"
            "- Return compatibility between 0 and 100 (decimal OK)\n"
            "- Return each component score between 0 and 100\n"
            "- Be strict: if a candidate has NO relevant skills/experience for a department, "
            "compatibility should be low (only languages might contribute)\n"
            "- Be fair: if a candidate clearly excels in a domain, the score should reflect that\n"
            "- Provide a concise reason for your decision\n\n"

            "Candidate profile:\n"
            f"{candidate_json}\n\n"

            "Computed evaluations (per-department breakdown):\n"
            f"{evals_json}\n\n"

            "Full resume text:\n"
            f"{text}\n\n"

            "Return ONLY valid JSON. No markdown, no explanation outside JSON.\n"
            "JSON schema (include EVERY department):\n"
            f"{json.dumps(schema, ensure_ascii=False, indent=2)}"
        )

    @staticmethod
    def _parse_json_response(raw_response: str) -> dict[str, Any]:
        print(raw_response)
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
            parsed = {"evaluations": parsed}

        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object or array, got {type(parsed)}")

        evals = parsed.get("evaluations", [])
        if not isinstance(evals, list):
            raise ValueError("Expected evaluations to be a list")

        parsed["evaluations"] = [
            item for item in evals
            if isinstance(item, dict) and str(item.get("department_name", "")).strip()
        ]

        print(
            f"\n\nLLM final scores: "
            f"{len(parsed['evaluations'])} departments evaluated",
            flush=True,
        )

        return parsed
