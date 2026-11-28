from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.llm_router import LLMRouterService, parse_json_payload


class _RecruitmentEmailResponse(BaseModel):
    subject: str = Field(default="Interview Invitation", min_length=1)
    body: str = Field(default="", min_length=1)


class RecruitmentEmailGenerator:
    @classmethod
    def generate(
        cls,
        variables: dict[str, str],
        db: Session | None = None,
        recruiter_id: int | None = None,
        grounded_context: str | None = None,
    ) -> dict[str, str]:
        prompt = cls._build_prompt(variables, grounded_context=grounded_context)
        result = LLMRouterService.generate(
            task_category="general_rag",
            prompt=prompt,
            action="recruitment_email_generation",
            db=db,
            recruiter_id=recruiter_id,
            json_mode=True,
            top_p=0.9,
            validator=cls._parse_json_response,
        )
        return result.parsed

    @classmethod
    def _build_prompt(
        cls,
        variables: dict[str, str],
        *,
        grounded_context: str | None = None,
    ) -> str:
        schema = {
            "subject": "email subject line",
            "body": "full email body in HTML format",
        }
        grounding_block = (
            f"\nGrounded Candidate & Job Evidence (cite/reference ONLY verified facts from below):\n{grounded_context}\n"
            if grounded_context
            else ""
        )
        return (
            "You are a professional recruitment assistant. Generate a polite and professional interview invitation email.\n\n"
            "Use the following variables:\n"
            f"- Candidate Name: {variables.get('candidate_name', 'Candidate')}\n"
            f"- Company Name: {variables.get('company_name', 'Company')}\n"
            f"- Job Title: {variables.get('job_title', 'Position')}\n"
            f"- Interview Date: {variables.get('interview_date', 'TBD')}\n"
            f"- Interview Time: {variables.get('interview_time', 'TBD')}\n"
            f"- Duration: {variables.get('duration_minutes', '60')} minutes\n"
            f"- Location: {variables.get('location', 'TBD')}\n"
            f"- Recruiter Name: {variables.get('recruiter_name', '')}\n"
            f"- Company Signature: {variables.get('company_name', '3GCOM')}\n\n"
            f"- Language: {variables.get('language', 'french')}\n"
            f"{grounding_block}\n"
            "Rules:\n"
            "1. The subject should be clear and professional.\n"
            "2. The body should be in HTML format with proper tags (p, br, strong, etc.).\n"
            "3. Include all the interview details clearly.\n"
            f"4. Write the entire email in {variables.get('language', 'french')}.\n"
            "5. The tone should be warm and professional.\n"
            "6. End with the recruiter's name and company signature.\n"
            "7. Only reference candidate skills or experience present in the provided evidence.\n"
            "8. Return only one valid JSON object. No markdown and no explanation outside JSON.\n\n"
            f"JSON schema:\n{json.dumps(schema, ensure_ascii=False, indent=2)}"
        )

    @staticmethod
    def _parse_json_response(raw_response: str) -> dict[str, Any]:
        parsed = parse_json_payload(raw_response)
        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object, got {type(parsed)}")

        validated = _RecruitmentEmailResponse.model_validate(
            {
                "subject": str(parsed.get("subject") or "Interview Invitation").strip(),
                "body": str(parsed.get("body") or "").strip(),
            }
        )
        return validated.model_dump()
