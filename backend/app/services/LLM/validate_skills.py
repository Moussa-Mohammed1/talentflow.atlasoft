from __future__ import annotations

import json
import os
from typing import Any

import requests


class LLMService:
    DEFAULT_ENDPOINT = "http://localhost:11434/api/generate"
    DEFAULT_MODEL = "qwen3:8b"

    @classmethod
    def endpoint(cls) -> str:
        return os.getenv("TALENTFLOW_SKILL_LLM_ENDPOINT", cls.DEFAULT_ENDPOINT).strip() or cls.DEFAULT_ENDPOINT

    @classmethod
    def model(cls) -> str:
        return os.getenv("TALENTFLOW_SKILL_LLM_MODEL", cls.DEFAULT_MODEL).strip() or cls.DEFAULT_MODEL

    @classmethod
    def validate(cls, text: str, skills: list[dict[str, Any]] | list[str]) -> dict[str, Any]:
        prompt = cls._build_skill_review_prompt(text, skills)
        response = requests.post(
            cls.endpoint(),
            json={
                "model": cls.model(),
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": float(os.getenv("TALENTFLOW_SKILL_LLM_TEMPERATURE", "0.1")),
                    "top_p": float(os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8")),
                    "num_predict": int(os.getenv("TALENTFLOW_SKILL_LLM_NUM_PREDICT", "2048")),
                },
            },
            timeout=float(os.getenv("TALENTFLOW_SKILL_LLM_TIMEOUT", "300")),
        )
        response.raise_for_status()
        payload = response.json()
        return cls._parse_json_response(str(payload.get("response", "")))

    @staticmethod
    def _build_skill_review_prompt(text: str, skills: list[dict[str, Any]] | list[str]) -> str:
        serialized_skills = json.dumps(skills, ensure_ascii=False)
        return f"""
You are an ATS skill extraction validator for French and English resumes.

Task:
1. Review the extracted skills against the raw resume text.
2. Keep only real professional skills, tools, technologies, methodologies, domain skills, and competencies.
3. Remove locations, schools, names, dates, language proficiency lines, job titles, and generic resume prose.
4. Add missing skills only when they are explicitly present in the resume text.
5. Preserve exact skill names as written when possible.

Think carefully about the resume before answering. After any private reasoning, your final answer must contain only one valid JSON object.
Do not write markdown.

JSON schema:
{{
  "skills": [
    {{
      "name": "exact skill name",
      "category": "Technology | Framework | Programming Language | Database | Cloud Platform | DevOps Tool | Networking Technology | Cybersecurity | Methodology | Soft Skill | Business Skill | Domain Knowledge | Competency",
      "confidence": 0.0,
      "evidence": "short exact resume line or phrase"
    }}
  ],
  "rejected": [
    {{
      "name": "removed extracted item",
      "reason": "short reason"
    }}
  ]
}}

Extracted skills:
{serialized_skills}

Raw resume text:
{text}
""".strip()

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
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start < 0 or end <= start:
                raise
            parsed = json.loads(cleaned[start : end + 1])

        if not isinstance(parsed, dict):
            raise ValueError("LLM response must be a JSON object")
        skills = parsed.get("skills", [])
        rejected = parsed.get("rejected", [])
        if not isinstance(skills, list):
            parsed["skills"] = []
        if not isinstance(rejected, list):
            parsed["rejected"] = []
        return parsed
