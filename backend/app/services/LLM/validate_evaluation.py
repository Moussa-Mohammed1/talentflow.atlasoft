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
    def validate(cls, file_path: str, evaluations: list[dict[str, Any]],
                 db: Session | None = None, recruiter_id: int | None = None) -> dict[str, Any]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            resume_text = f.read()
        prompt = cls._build_evaluation_review_prompt(resume_text, evaluations)
        print("calling deepseek...", flush=True)
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
                    action="evaluation_validation",
                    model=cls.model(),
                    tokens_prompt=response.usage.prompt_tokens if response.usage else 0,
                    tokens_completion=response.usage.completion_tokens if response.usage else 0,
                    duration_ms=duration,
                )
            except Exception:
                pass
        return cls._parse_json_response(content)

    @staticmethod
    def _build_evaluation_review_prompt(text: str, evaluations: list[dict[str, Any]]) -> str:
        serialized = json.dumps(evaluations, ensure_ascii=False, indent=2)
        schema = {
            "evaluations": [
                {
                    "department_name": "department name",
                    "compatibility": 0.0,
                    "reason": "brief explanation for any correction or confirmation",
                    "requirements": [
                        {
                            "experience": "skill name",
                            "required_years": 0,
                            "candidate_years": 0.0,
                            "score": 0.0,
                            "matched": True,
                        }
                    ],
                    "missing_experiences": ["skill1", "skill2"],
                    "candidate_extra_experiences": ["skill3", "skill4"],
                }
            ]
        }
        return (
            "You are an expert ATS evaluator reviewing department-level candidate evaluations.\n"
            "Your task is to validate and correct the computed evaluations based on the actual resume.\n\n"

            "For each department evaluation:\n"
            "1. Verify that the compatibility score reflects the candidate's actual skills and experience.\n"
            "2. For each requirement, check if the candidate truly has that skill/experience in the resume.\n"
            "3. Correct the candidate_years and score if they don't match the resume.\n"
            "4. Update matched to true only if the resume explicitly shows that experience.\n"
            "5. Fix missing_experiences: remove skills the candidate actually has, add truly missing ones.\n"
            "6. Fix candidate_extra_experiences: keep only skills genuinely found in the resume.\n\n"

            "Rules:\n"
            "- A skill is matched only if it appears explicitly in the resume text.\n"
            "- Use exact skill names as they appear in the resume.\n"
            "- candidate_years should reflect total years of experience for that skill.\n"
            "- score = min(candidate_years / required_years, 1.0) * 100.\n"
            "- If required_years is 0, score is 100 if candidate_years > 0, else 0.\n"
            "- Never invent skills or experience not present in the resume.\n"
            "- Never remove skills that are clearly present in the resume.\n"
            "- compatibility = average of all requirement scores, rounded to 2 decimals.\n\n"

            "Return only one valid JSON object. No markdown and no explanation outside JSON.\n\n"
            "JSON schema:\n"
            f"{json.dumps(schema, ensure_ascii=False, indent=2)}\n\n"
            "Computed evaluations:\n"
            f"{serialized}\n\n"
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
            f"\n\nLLM evaluation review: "
            f"{len(parsed['evaluations'])} departments reviewed",
            flush=True,
        )

        return parsed
