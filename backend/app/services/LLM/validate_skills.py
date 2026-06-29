from __future__ import annotations

import json
import os
from typing import Any

from openai import OpenAI


class LLMService:
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
    def validate(cls, text: str, skills: list[dict[str, Any]] | list[str]) -> dict[str, Any]:
        prompt = cls._build_skill_review_prompt(text, skills)
        print("calling deepseek...")
        response = cls._client().chat.completions.create(
            model=cls.model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=float(os.getenv("TALENTFLOW_SKILL_LLM_TEMPERATURE", "0.1")),
            top_p=float(os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8")),
            max_tokens=int(os.getenv("TALENTFLOW_SKILL_LLM_NUM_PREDICT", "4096")),
        )
        content = response.choices[0].message.content or ""
        print("printing result...")
        print(content)
        return cls._parse_json_response(content)

    @staticmethod
    def _build_skill_review_prompt(text: str, skills: list[dict[str, Any]] | list[str]) -> str:
        serialized_skills = json.dumps(skills, ensure_ascii=False)
        return (
        "You are an ATS technical skill extraction and validation expert for French and English resumes.\n\n"

        "Your PRIMARY task is to identify ALL technical skills explicitly present in the resume.\n"
        "Do not limit yourself to the extracted skills list.\n"
        "Read the entire resume text and build a complete inventory of technical skills.\n\n"

        "Technical skills include:\n"
        "- Programming languages\n"
        "- Frameworks and libraries\n"
        "- Databases\n"
        "- DevOps and CI/CD tools\n"
        "- Cloud services\n"
        "- Operating systems\n"
        "- Development tools\n"
        "- Networking technologies\n"
        "- Telecommunications technologies\n"
        "- Protocols\n"
        "- Cybersecurity tools\n"
        "- Web servers\n"
        "- Version control tools and platforms\n"
        "- Certifications\n"
        "- Technical methodologies\n\n"

        "Pay special attention to technologies appearing in lists such as:\n"
        "- PROGRAMMING LANGUAGES\n"
        "- FRONT-END\n"
        "- BACK-END\n"
        "- DEVOPS & CI/CD\n"
        "- DATABASES\n"
        "- TOOLS\n"
        "- TECHNOLOGIES\n"
        "- TECHNICAL SKILLS\n\n"

        "Examples of valid technical skills include:\n"
        "PHP, JavaScript, TypeScript, C, C#, C++, Python, Java, HTML, CSS,\n"
        "Bootstrap, Tailwind CSS, React, Angular, Vue.js, Laravel,\n"
        "Docker, GitHub, GitHub Actions, GitLab, Apache, Nginx,\n"
        "MySQL, PostgreSQL, MongoDB, Linux, Scrum, UML, Merise.\n\n"

        "Review the extracted skills list:\n"
        "- If an extracted item is a valid technical skill, include it in skills.\n"
        "- If an extracted item is not a technical skill, include it in rejected.\n"
        "- Do not omit reviewed items.\n\n"

        "Then scan the ENTIRE resume and add any missing technical skills that were not present in the extracted skills list.\n\n"

        "The final skills list must contain:\n"
        "1. All valid extracted skills.\n"
        "2. All additional technical skills explicitly found in the resume.\n"
        "3. No inferred skills.\n\n"

        "Discard:\n"
        "- Personal information\n"
        "- Email addresses\n"
        "- Phone numbers\n"
        "- Company names\n"
        "- Project descriptions\n"
        "- Responsibilities\n"
        "- Achievements\n"
        "- Section titles\n"
        "- Job titles\n"
        "- Educational institutions\n"
        "- Soft skills\n"
        "- Arbitrary text fragments\n\n"

        "The response root MUST be a JSON object.\n"
        "Do not return a JSON array.\n"
        "Do not write markdown.\n"
        "Do not explain your reasoning.\n"
        "Return only the final JSON object.\n\n"

        "JSON schema:\n"
        "{\n"
        '  "skills": [\n'
        "    {\n"
        '      "name": "exact skill name as written in the resume",\n'
        '      "category": "Programming Language | Framework | Database | DevOps Tool | Cloud Service | Networking Technology | Telecommunications Technology | Protocol | Operating System | Cybersecurity Tool | Methodology | Certification | Development Tool | Web Server | Version Control Tool | Other"\n'
        "    }\n"
        "  ],\n"
        '  "rejected": [\n'
        "    {\n"
        '      "name": "rejected item",\n'
        '      "reason": "short rejection reason"\n'
        "    }\n"
        "  ]\n"
        "}\n\n"

        "Extracted skills:\n"
        + serialized_skills
        + "\n\nResume text:\n"
        + text
    )

    @staticmethod
    def _parse_json_response(raw_response: str) -> dict[str, Any]:
        cleaned = raw_response.strip()

        # Legacy think tags
        if "</think>" in cleaned:
            cleaned = cleaned.split("</think>", 1)[1].strip()

        # Markdown fences
        if cleaned.startswith("```"):
            cleaned = cleaned.removeprefix("```").strip()

            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()

            if cleaned.endswith("```"):
                cleaned = cleaned[:-3].strip()

        try:
            parsed = json.loads(cleaned)

        except json.JSONDecodeError:
            parsed = None

            # Try extracting JSON object
            obj_start = cleaned.find("{")
            obj_end = cleaned.rfind("}")

            if obj_start >= 0 and obj_end > obj_start:
                try:
                    parsed = json.loads(
                        cleaned[obj_start : obj_end + 1]
                    )
                except json.JSONDecodeError:
                    pass

            # Try extracting JSON array
            if parsed is None:
                arr_start = cleaned.find("[")
                arr_end = cleaned.rfind("]")

                if arr_start >= 0 and arr_end > arr_start:
                    parsed = json.loads(
                        cleaned[arr_start : arr_end + 1]
                    )
                else:
                    raise
        if not isinstance(parsed["skills"], list):
            raise ValueError(
                f"Expected skills to be a list, got {type(parsed['skills'])}"
            )

        if not isinstance(parsed["rejected"], list):
            raise ValueError(
                f"Expected rejected to be a list, got {type(parsed['rejected'])}"
            )
        if isinstance(parsed, list):
            parsed = {
                "skills": parsed,
                "rejected": [],
            }

        if not isinstance(parsed, dict):
            raise ValueError(
                f"LLM response must be a JSON object or array, got {type(parsed)}"
            )

        parsed.setdefault("skills", [])
        parsed.setdefault("rejected", [])

        if not isinstance(parsed["skills"], list):
            parsed["skills"] = []

        if not isinstance(parsed["rejected"], list):
            parsed["rejected"] = []

        # Keep only valid objects
        parsed["skills"] = [
            item
            for item in parsed["skills"]
            if isinstance(item, dict)
            and str(item.get("name", "")).strip()
        ]

        parsed["rejected"] = [
            item
            for item in parsed["rejected"]
            if isinstance(item, dict)
            and str(item.get("name", "")).strip()
        ]

        print(
            f"\n\nLLM review: "
            f"{len(parsed['skills'])} accepted, "
            f"{len(parsed['rejected'])} rejected"
        )

        return parsed