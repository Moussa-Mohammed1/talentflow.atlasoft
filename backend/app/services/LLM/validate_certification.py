from __future__ import annotations

import json
import os
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.llm_router import LLMRouterService, parse_json_payload


class _CertificationValidationResponse(BaseModel):
    certifications: list[dict[str, Any]] = Field(default_factory=list)
    rejected: list[dict[str, Any]] = Field(default_factory=list)


class LLMService:
    @classmethod
    def validate(
        cls,
        text: str,
        certifications: list[dict[str, Any]],
        db: Session | None = None,
        recruiter_id: int | None = None,
    ) -> dict[str, Any]:
        prompt = cls._build_certification_review_prompt(text, certifications)
        result = LLMRouterService.generate(
            task_category="cv_extraction",
            prompt=prompt,
            action="certification_validation",
            db=db,
            recruiter_id=recruiter_id,
            json_mode=True,
            top_p=float(
                os.getenv(
                    "TALENTFLOW_CERTIFICATION_LLM_TOP_P",
                    os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8"),
                )
            ),
            validator=cls._parse_json_response,
        )
        return result.parsed

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
        parsed = parse_json_payload(raw_response)
        if isinstance(parsed, list):
            parsed = {"certifications": parsed, "rejected": []}
        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object or array, got {type(parsed)}")

        validated = _CertificationValidationResponse.model_validate(
            {
                "certifications": parsed.get("certifications") if isinstance(parsed.get("certifications"), list) else [],
                "rejected": parsed.get("rejected") if isinstance(parsed.get("rejected"), list) else [],
            }
        )
        certifications = [
            item for item in validated.certifications
            if isinstance(item, dict) and str(item.get("name", "")).strip()
        ]
        rejected = [
            item for item in validated.rejected
            if isinstance(item, dict) and str(item.get("name", "")).strip()
        ]
        return {"certifications": certifications, "rejected": rejected}
