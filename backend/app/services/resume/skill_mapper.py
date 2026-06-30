from __future__ import annotations

from typing import Any


class SkillMapper:
    """Converts raw skill extraction output to API format."""

    @classmethod
    def convert_mention(cls, m: dict) -> dict[str, Any]:
        signals = m.get("scores", {})
        return {
            "original": m.get("original", ""),
            "normalized": m.get("normalized", ""),
            "name": m.get("canonical") or m.get("normalized") or m.get("original"),
            "category": m.get("category", ""),
            "confidence": float(m.get("confidence", 0.0) or 0.0),
            "section": m.get("section", ""),
            "source": ",".join(m.get("sources", [])) if m.get("sources") else "",
            "signals": {
                "ner_score": float(signals.get("validation", 0.0)),
                "semantic_score": float(signals.get("semantic", 0.0)),
                "section_score": float(signals.get("section", 0.0)),
                "frequency_score": float(signals.get("frequency", 0.0)),
                "context_score": float(signals.get("context", 0.0)),
            },
        }

    @classmethod
    def convert_skills(cls, result: dict) -> dict[str, Any]:
        return {
            "sections": result.get("sections", []),
            "technologies": [cls.convert_mention(m) for m in result.get("technologies", [])],
            "competencies": [cls.convert_mention(m) for m in result.get("competencies", [])],
            "skills_by_category": {
                cat: [cls.convert_mention(m) for m in items]
                for cat, items in (result.get("skills_by_category") or {}).items()
            },
            "flattened_skills": [s.get("normalized") or s.get("original") for s in result.get("skills", [])],
        }
