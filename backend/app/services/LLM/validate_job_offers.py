from __future__ import annotations

import json
import os
from typing import Any, Literal

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.llm_router import LLMRouterService, parse_json_payload


class _JobOfferValidationResponse(BaseModel):
    title: str = Field(default="Untitled Position", min_length=1)
    description: str | None = None
    responsibilities: str | None = None
    department_name: str | None = None
    employment_type: Literal["full_time", "part_time", "internship", "contract", "freelance"] = "full_time"
    work_mode: Literal["on_site", "hybrid", "remote"] = "on_site"
    seniority_level: Literal["junior", "mid", "senior", "lead"] = "mid"
    openings: int = Field(default=1, ge=1)


class LLMService:
    @classmethod
    def validate(
        cls,
        description: str,
        db: Session | None = None,
        recruiter_id: int | None = None,
    ) -> dict[str, Any]:
        prompt = cls._build_job_offer_prompt(description)
        result = LLMRouterService.generate(
            task_category="job_offer_drafting",
            prompt=prompt,
            action="job_offer_generation",
            db=db,
            recruiter_id=recruiter_id,
            json_mode=True,
            top_p=float(os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8")),
            validator=cls._parse_json_response,
        )
        return result.parsed

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
        parsed = parse_json_payload(raw_response)
        if isinstance(parsed, list):
            parsed = parsed[0] if parsed else {}
        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object, got {type(parsed)}")

        normalized = {
            "title": str(parsed.get("title") or "Untitled Position").strip() or "Untitled Position",
            "description": parsed.get("description"),
            "responsibilities": parsed.get("responsibilities"),
            "department_name": parsed.get("department_name"),
            "employment_type": parsed.get("employment_type") or "full_time",
            "work_mode": parsed.get("work_mode") or "on_site",
            "seniority_level": parsed.get("seniority_level") or "mid",
            "openings": parsed.get("openings") or 1,
        }
        validated = _JobOfferValidationResponse.model_validate(normalized)
        return validated.model_dump()
