from __future__ import annotations

import json
import os
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.llm_router import LLMRouterService, parse_json_payload


class _SkillValidationResponse(BaseModel):
    skills: list[dict[str, Any]] = Field(default_factory=list)
    rejected: list[dict[str, Any]] = Field(default_factory=list)


class LLMService:
    @classmethod
    def validate(
        cls,
        text: str,
        skills: list[dict[str, Any]] | list[str],
        db: Session | None = None,
        recruiter_id: int | None = None,
    ) -> dict[str, Any]:
        prompt = cls._build_skill_review_prompt(text, skills)
        result = LLMRouterService.generate(
            task_category="cv_extraction",
            prompt=prompt,
            action="skill_validation",
            db=db,
            recruiter_id=recruiter_id,
            json_mode=True,
            top_p=float(os.getenv("TALENTFLOW_SKILL_LLM_TOP_P", "0.8")),
            validator=cls._parse_json_response,
        )
        return result.parsed

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
        parsed = parse_json_payload(raw_response)
        if isinstance(parsed, list):
            parsed = {"skills": parsed, "rejected": []}
        if not isinstance(parsed, dict):
            raise ValueError(f"LLM response must be a JSON object or array, got {type(parsed)}")

        validated = _SkillValidationResponse.model_validate(parsed)
        skills = [
            item for item in validated.skills
            if isinstance(item, dict) and str(item.get("name", "")).strip()
        ]
        rejected = [
            item for item in validated.rejected
            if isinstance(item, dict) and str(item.get("name", "")).strip()
        ]
        return {"skills": skills, "rejected": rejected}
