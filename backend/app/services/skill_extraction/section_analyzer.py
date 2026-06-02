import re
from typing import Any

from app.services.skill_extraction.constants import SECTION_ALIASES
from app.services.skill_extraction.models import SectionSpan
from app.services.skill_extraction.ontology import SkillOntology



class ResumeSectionAnalyzer:
    def __init__(self) -> None:
        self.alias_lookup = {
            self._normalize(alias): section
            for section, aliases in SECTION_ALIASES.items()
            for alias in aliases
        }

    @staticmethod
    def _normalize(value: str) -> str:
        value = SkillOntology.strip_accents(value).casefold()
        value = re.sub(r"[^a-z0-9]+", " ", value)
        return re.sub(r"\s+", " ", value).strip()

    def _detect_section(self, line: str) -> tuple[str | None, float]:
        normalized = self._normalize(line)
        if not normalized:
            return None, 0.0

        if normalized in self.alias_lookup:
            return self.alias_lookup[normalized], 1.0

        for alias, section in self.alias_lookup.items():
            if normalized.startswith(alias) and len(alias) >= 4:
                return section, 0.84

        compact = normalized.replace(" ", "")
        if compact in {"competencestechniques", "hardskills", "technicalskills"}:
            return "technical_skills", 1.0

        if line.isupper() and 2 <= len(line.split()) <= 4:
            heading = normalized
            if heading in self.alias_lookup:
                return self.alias_lookup[heading], 0.95

        return None, 0.0

    def analyze(self, text: str) -> list[SectionSpan]:
        lines = text.splitlines()
        line_positions: list[tuple[int, int, str]] = []
        cursor = 0
        for line in lines:
            start = cursor
            end = cursor + len(line)
            line_positions.append((start, end, line))
            cursor = end + 1

        sections: list[SectionSpan] = []
        current_name = "unknown"
        current_heading = ""
        current_start_line = 1
        current_start_char = 0
        current_confidence = 0.3
        current_metadata: dict[str, Any] = {}

        def close_section(end_line: int, end_char: int) -> None:
            sections.append(
                SectionSpan(
                    name=current_name,
                    heading=current_heading,
                    start_line=current_start_line,
                    end_line=end_line,
                    start_char=current_start_char,
                    end_char=end_char,
                    confidence=current_confidence,
                    metadata=dict(current_metadata),
                )
            )

        for index, (start_char, end_char, line) in enumerate(line_positions, start=1):
            stripped = line.strip()
            if not stripped:
                continue

            section_name, confidence = self._detect_section(stripped)
            if section_name is None:
                continue

            if index > current_start_line:
                close_section(index - 1, start_char)

            current_name = section_name
            current_heading = stripped
            current_start_line = index
            current_start_char = end_char + 1 if end_char < len(text) else end_char
            current_confidence = confidence
            current_metadata = {"heading": stripped, "line": index}

        close_section(len(lines) if lines else 0, len(text))
        return sections
