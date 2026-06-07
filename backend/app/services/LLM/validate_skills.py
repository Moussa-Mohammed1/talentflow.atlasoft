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
        prompt = "/no_think\n" + cls._build_skill_review_prompt(text, skills)
        print("calling ollama...")
        print(f"current timeout : {float(os.getenv('TALENTFLOW_SKILL_LLM_TIMEOUT', '300'))}\n")
        print("prompt: \n")
        print(prompt)
        response = requests.post(
            cls.endpoint(),
            json={
                "model": cls.model(),
                "prompt": prompt,
                "stream": False,
                "think": False,
                "options": {
                    "temperature": float(os.getenv("TALENTFLOW_SKILL_LLM_TEMPERATURE", "0.1")),
                    "top_p": float(os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8")),
                    "num_predict": int(os.getenv("TALENTFLOW_SKILL_LLM_NUM_PREDICT", "2048")),
                },
            },
            timeout=float(os.getenv("TALENTFLOW_SKILL_LLM_TIMEOUT", "300")),
        )
        print("printing result...")
        print(response.text)
        response.raise_for_status()
        payload = response.json()
        return cls._parse_json_response(str(payload.get("response", "")))

    @staticmethod
    def _build_skill_review_prompt(text: str, skills: list[dict[str, Any]] | list[str]) -> str:
        serialized_skills = json.dumps(skills, ensure_ascii=False)
        return (
        "You are an ATS skill extraction validator for French and English resumes.\n"
        "Review the extracted skills against the resume text.\n"
        "Remove any incorrectly extracted items.\n"
        "Keep only skills explicitly mentioned or strongly supported by the resume.\n"
        "Do not infer unsupported skills.\n"

        "Keep only technologies, tools, frameworks, programming languages, "
        "networking technologies, telecommunications technologies, protocols, "
        "platforms, certifications, methodologies, databases, operating systems, "
        "cloud services, cybersecurity tools, and technical competencies.\n"

        "Discard personal information, contact details, project descriptions, "
        "responsibilities, sentences, achievements, company names, section titles, "
        "job titles, educational institutions, arbitrary text fragments, and soft skills.\n"

        "Return only skills useful for matching candidates to technical positions in "
        "networking, telecommunications, IT infrastructure, cybersecurity, software engineering, cloud, or DevOps.\n"
        "Do not explain your reasoning.\n"
        "Do not think step by step.\n"
        "Do not write markdown.\n"
        "Return only the final JSON object.\n"
        
        
        "JSON schema:\n"
        "{\n"
        '  "skills": [\n'
        "    {\n"
        '      "name": "exact skill name",\n'
        '      "category": "Programming Language | Framework | Database | DevOps Tool | Cloud Service | Networking Technology | Telecommunications Technology | Protocol | Operating System | Cybersecurity Tool | Methodology | Certification | Development Tool | Other"\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Extracted skills:\n"
        + serialized_skills
        + "\n\nRaw resume text:\n"
        + text
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
