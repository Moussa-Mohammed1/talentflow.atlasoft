from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.llm_router import LLMRouterService, parse_json_payload


class _DepartmentEvaluationItem(BaseModel):
    department_name: str = Field(min_length=1)
    compatibility: float = Field(ge=0.0, le=100.0)
    reason: str | None = None
    skills_score: float | None = Field(default=None, ge=0.0, le=100.0)
    experience_score: float | None = Field(default=None, ge=0.0, le=100.0)
    education_score: float | None = Field(default=None, ge=0.0, le=100.0)
    certifications_score: float | None = Field(default=None, ge=0.0, le=100.0)
    languages_score: float | None = Field(default=None, ge=0.0, le=100.0)
    preferred_skills_score: float | None = Field(default=None, ge=0.0, le=100.0)


class _EvaluationValidationResponse(BaseModel):
    evaluations: list[_DepartmentEvaluationItem] = Field(default_factory=list)


class LLMService:
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
        result = LLMRouterService.generate(
            task_category="candidate_evaluation",
            prompt=prompt,
            action="evaluation_finalize",
            db=db,
            recruiter_id=recruiter_id,
            json_mode=True,
            top_p=0.8,
            validator=cls._parse_json_response,
        )
        return result.parsed

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
                }
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
        parsed = parse_json_payload(raw_response)
        if isinstance(parsed, list):
            parsed = {"evaluations": parsed}
        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object or array, got {type(parsed)}")

        evals = parsed.get("evaluations", [])
        if not isinstance(evals, list):
            raise ValueError("Expected evaluations to be a list")

        filtered = [
            item for item in evals
            if isinstance(item, dict) and str(item.get("department_name", "")).strip()
        ]
        validated = _EvaluationValidationResponse.model_validate({"evaluations": filtered})
        return {"evaluations": [item.model_dump(exclude_none=True) for item in validated.evaluations]}
