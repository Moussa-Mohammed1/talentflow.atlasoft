from __future__ import annotations

import json
import os
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.llm_router import LLMRouterService, parse_json_payload


class _EducationValidationResponse(BaseModel):
    educations: list[dict[str, Any]] = Field(default_factory=list)
    rejected: list[dict[str, Any]] = Field(default_factory=list)


class LLMService:
    @classmethod
    def validate(
        cls,
        file_path: str,
        educations: list[dict[str, Any]],
        db: Session | None = None,
        recruiter_id: int | None = None,
    ) -> dict[str, Any]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            resume_text = f.read()
        prompt = cls._build_education_review_prompt(resume_text, educations)
        result = LLMRouterService.generate(
            task_category="cv_extraction",
            prompt=prompt,
            action="education_validation",
            db=db,
            recruiter_id=recruiter_id,
            json_mode=True,
            top_p=float(
                os.getenv(
                    "TALENTFLOW_EDUCATION_LLM_TOP_P",
                    os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8"),
                )
            ),
            validator=cls._parse_json_response,
        )
        return result.parsed

    @staticmethod
    def _build_education_review_prompt(text: str, educations: list[dict[str, Any]]) -> str:
        schema = {
            "educations": [
                {
                    "candidate_index": 0,
                    "action": "accepted | corrected | rejected",
                    "institution": "school or university name exactly as supported by the resume",
                    "degree": "degree name or null",
                    "field_of_study": "field of study or null",
                    "start_date": "YYYY-MM-DD",
                    "end_date": "YYYY-MM-DD or null for ongoing",
                    "confidence": 0.0,
                    "reason": "short verification reason",
                    "evidence": ["exact supporting lines from the resume"],
                }
            ]
        }
        return (
            "You verify education entries extracted from a French or English resume.\n"
            "Review every candidate exactly once using its candidate_index.\n"
            "For each missing education record, add one item with candidate_index set to null and action corrected.\n"
            "Accept records supported by the resume, correct only fields explicitly supported by the text, "
            "and reject non-education entries such as work experience, certifications, or projects.\n"
            "Never invent a numeric candidate_index that was not supplied. Never infer missing dates or details.\n"
            "Every corrected or newly added record must include exact resume lines in evidence.\n"
            "Use null end_date for Present, Current, aujourd'hui, actuel, or en cours.\n"
            "Return only one valid JSON object. No markdown and no explanation outside JSON.\n\n"
            "JSON schema:\n"
            f"{json.dumps(schema, ensure_ascii=False, indent=2)}\n\n"
            "Extracted candidates:\n"
            f"{json.dumps(educations, ensure_ascii=False, default=str)}\n\n"
            "Resume text:\n"
            f"{text}"
        )

    @staticmethod
    def _parse_json_response(raw_response: str) -> dict[str, Any]:
        parsed = parse_json_payload(raw_response)
        if isinstance(parsed, list):
            parsed = {"educations": parsed, "rejected": []}
        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object or array, got {type(parsed)}")

        validated = _EducationValidationResponse.model_validate(
            {
                "educations": parsed.get("educations") if isinstance(parsed.get("educations"), list) else [],
                "rejected": parsed.get("rejected") if isinstance(parsed.get("rejected"), list) else [],
            }
        )
        educations = [
            item for item in validated.educations
            if isinstance(item, dict) and str(item.get("institution", "")).strip()
        ]
        rejected = [
            item for item in validated.rejected
            if isinstance(item, dict) and str(item.get("name", "")).strip()
        ]
        return {"educations": educations, "rejected": rejected}
