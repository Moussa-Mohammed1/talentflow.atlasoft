from __future__ import annotations

import json
import os
from typing import Any

from openai import OpenAI


class RecruitmentEmailGenerator:
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
    def generate(cls, variables: dict[str, str]) -> dict[str, str]:
        prompt = cls._build_prompt(variables)
        print("Calling DeepSeek for email generation...", flush=True)
        response = cls._client().chat.completions.create(
            model=cls.model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            top_p=0.9,
            max_tokens=2048,
        )
        content = response.choices[0].message.content or ""
        print("Email generation result received", flush=True)
        return cls._parse_json_response(content)

    @classmethod
    def _build_prompt(cls, variables: dict[str, str]) -> str:
        schema = {
            "subject": "email subject line",
            "body": "full email body in HTML format",
        }
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
            f"- Language: {variables.get('language', 'french')}\n\n"
            "Rules:\n"
            "1. The subject should be clear and professional.\n"
            "2. The body should be in HTML format with proper tags (p, br, strong, etc.).\n"
            "3. Include all the interview details clearly.\n"
            f"4. Write the entire email in {variables.get('language', 'french')}.\n"
            "5. The tone should be warm and professional.\n"
            "6. End with the recruiter's name and company signature.\n"
            "7. Return only one valid JSON object. No markdown and no explanation outside JSON.\n\n"
            f"JSON schema:\n{json.dumps(schema, ensure_ascii=False, indent=2)}"
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
            obj_start = cleaned.find("{")
            obj_end = cleaned.rfind("}")
            if obj_start >= 0 and obj_end > obj_start:
                try:
                    parsed = json.loads(cleaned[obj_start : obj_end + 1])
                except json.JSONDecodeError:
                    raise ValueError("Failed to parse LLM response as JSON")
            else:
                raise ValueError("Failed to parse LLM response as JSON")

        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object, got {type(parsed)}")

        return {
            "subject": str(parsed.get("subject", "Interview Invitation")).strip(),
            "body": str(parsed.get("body", "")).strip(),
        }
