from __future__ import annotations

import json
import os
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.llm_router import LLMRouterService, parse_json_payload


class _IdentityValidationResponse(BaseModel):
    name: dict[str, Any] = Field(default_factory=dict)
    email: dict[str, Any] = Field(default_factory=dict)
    phone: dict[str, Any] = Field(default_factory=dict)
    rejected: list[dict[str, Any]] = Field(default_factory=list)


class LLMService:
    @classmethod
    def validate(
        cls,
        text: str,
        identity: dict[str, Any],
        db: Session | None = None,
        recruiter_id: int | None = None,
    ) -> dict[str, Any]:
        prompt = cls._build_identity_review_prompt(text, identity)
        result = LLMRouterService.generate(
            task_category="cv_extraction",
            prompt=prompt,
            action="identity_validation",
            db=db,
            recruiter_id=recruiter_id,
            json_mode=True,
            top_p=float(
                os.getenv(
                    "TALENTFLOW_IDENTITY_LLM_TOP_P",
                    os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8"),
                )
            ),
            validator=cls._parse_json_response,
        )
        return result.parsed

    @staticmethod
    def _build_identity_review_prompt(text: str, identity: dict[str, Any]) -> str:
        serialized_identity = json.dumps(identity, ensure_ascii=False)
        schema = {
            "name": {
                "full_name": "",
                "confidence": 0.0,
                "score": 0,
                "evidence": "",
                "action": "accepted | corrected | rejected | missing",
            },
            "email": {
                "value": "",
                "confidence": 0.0,
                "evidence": "",
                "action": "accepted | corrected | rejected | missing",
            },
            "phone": {
                "value": "",
                "confidence": 0.0,
                "evidence": "",
                "action": "accepted | corrected | rejected | missing",
            },
            "rejected": [
                {
                    "field": "name | email | phone",
                    "value": "",
                    "reason": "",
                }
            ],
        }
        return (
            "You validate identity information extracted from a French or English resume.\n"
            "Return ONLY one valid JSON object matching this schema.\n"
            "No markdown. No explanations.\n\n"
            f"{json.dumps(schema, indent=2)}\n\n"
            "Extracted identity:\n"
            f"{serialized_identity}\n\n"
            "Resume text:\n"
            f"{text}"
        )

    @staticmethod
    def _parse_json_response(raw_response: str) -> dict[str, Any]:
        parsed = parse_json_payload(raw_response)
        if isinstance(parsed, list):
            parsed = {"rejected": []}
        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object or array, got {type(parsed)}")

        validated = _IdentityValidationResponse.model_validate(
            {
                "name": parsed.get("name") if isinstance(parsed.get("name"), dict) else {},
                "email": parsed.get("email") if isinstance(parsed.get("email"), dict) else {},
                "phone": parsed.get("phone") if isinstance(parsed.get("phone"), dict) else {},
                "rejected": parsed.get("rejected") if isinstance(parsed.get("rejected"), list) else [],
            }
        )
        rejected = [
            item for item in validated.rejected
            if isinstance(item, dict) and str(item.get("field", "")).strip()
        ]
        return {
            "name": validated.name,
            "email": validated.email,
            "phone": validated.phone,
            "rejected": rejected,
        }
