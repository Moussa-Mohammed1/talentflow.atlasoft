from __future__ import annotations

import json
import os
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.llm_router import LLMRouterService, parse_json_payload


class _ExperienceValidationResponse(BaseModel):
    experiences: list[dict[str, Any]] = Field(default_factory=list)
    rejected: list[dict[str, Any]] = Field(default_factory=list)


class LLMService:
    @classmethod
    def validate(
        cls,
        text: str,
        experiences: list[dict[str, Any]],
        db: Session | None = None,
        recruiter_id: int | None = None,
    ) -> dict[str, Any]:
        prompt = cls._build_experience_review_prompt(text, experiences)
        result = LLMRouterService.generate(
            task_category="cv_extraction",
            prompt=prompt,
            action="experience_validation",
            db=db,
            recruiter_id=recruiter_id,
            json_mode=True,
            top_p=float(
                os.getenv(
                    "TALENTFLOW_EXPERIENCE_LLM_TOP_P",
                    os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8"),
                )
            ),
            validator=cls._parse_json_response,
        )
        return result.parsed

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
            "Professional experience means employment or internships at companies/organizations.\n"
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
        parsed = parse_json_payload(raw_response)
        if isinstance(parsed, list):
            parsed = {"experiences": parsed, "rejected": []}
        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object or array, got {type(parsed)}")

        validated = _ExperienceValidationResponse.model_validate(
            {
                "experiences": parsed.get("experiences") if isinstance(parsed.get("experiences"), list) else [],
                "rejected": parsed.get("rejected") if isinstance(parsed.get("rejected"), list) else [],
            }
        )
        experiences = [
            item for item in validated.experiences
            if isinstance(item, dict) and str(item.get("title", "")).strip()
        ]
        rejected = [
            item for item in validated.rejected
            if isinstance(item, dict) and str(item.get("name", "")).strip()
        ]
        return {"experiences": experiences, "rejected": rejected}
