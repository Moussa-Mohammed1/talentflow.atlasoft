from __future__ import annotations

import re

from app.services.experience_extraction.date_parser import BilingualDateRangeParser
from app.services.experience_extraction.models import ExperienceMention
from app.services.skill_extraction.models import SectionSpan


class ExperienceBlockExtractor:
    _BULLET = re.compile(r"^\s*(?:[-*\u2022\u25e6\u25aa]|\d+[.)])\s*")

    def __init__(self) -> None:
        self.date_parser = BilingualDateRangeParser()

    @classmethod
    def _clean_line(cls, line: str) -> str:
        return cls._BULLET.sub("", line).strip()

    @classmethod
    def _is_header_line(cls, line: str) -> bool:
        stripped = line.strip()
        return bool(
            stripped
            and len(stripped) <= 140
            and not cls._BULLET.match(line)
            and not stripped.endswith((".", ";"))
        )

    def _header_start(self, lines: list[str], date_index: int, previous_date: int) -> int:
        start = date_index
        for index in range(date_index - 1, max(previous_date, date_index - 3), -1):
            if not self._is_header_line(lines[index]):
                break
            start = index
        return start

    def extract(self, text: str, sections: list[SectionSpan]) -> tuple[list[ExperienceMention], int]:
        mentions: list[ExperienceMention] = []
        rejected = 0
        experience_sections = [section for section in sections if section.name == "experience"]
        search_sections = experience_sections or [
            SectionSpan("unknown", "", 1, max(1, len(text.splitlines())), 0, len(text), 0.3)
        ]

        for section in search_sections:
            section_text = text[section.start_char:section.end_char]
            lines = section_text.splitlines()
            dated_lines = [
                (index, parsed)
                for index, line in enumerate(lines)
                if (parsed := self.date_parser.find(line)) is not None
            ]
            header_starts = [
                self._header_start(lines, index, dated_lines[position - 1][0] if position else -1)
                for position, (index, _) in enumerate(dated_lines)
            ]

            for position, (date_index, parsed) in enumerate(dated_lines):
                same_line_header = lines[date_index][:parsed.start_index].strip(" |,-")
                header_lines = [
                    self._clean_line(line)
                    for line in lines[header_starts[position]:date_index]
                    if self._clean_line(line)
                ]
                if same_line_header:
                    header_lines.append(self._clean_line(same_line_header))
                title = " | ".join(dict.fromkeys(header_lines)).strip()

                description_end = header_starts[position + 1] if position + 1 < len(header_starts) else len(lines)
                description_lines = [
                    self._clean_line(line)
                    for line in lines[date_index + 1:description_end]
                    if self._clean_line(line)
                ]
                description = "\n".join(description_lines) or None

                if not title:
                    rejected += 1
                    continue

                confidence = 0.68
                confidence += 0.12 if experience_sections else 0.0
                confidence += 0.08 if description else 0.0
                confidence += 0.05 if len(title) >= 4 else 0.0
                confidence += 0.04 if parsed.end_date is None else 0.0
                evidence = [line.strip() for line in lines[header_starts[position]:description_end] if line.strip()]
                mentions.append(
                    ExperienceMention(
                        title=title,
                        description=description,
                        start_date=parsed.start_date,
                        end_date=parsed.end_date,
                        confidence=round(min(confidence, 0.97), 4),
                        section=section.name,
                        evidence=evidence,
                    )
                )

        return mentions, rejected
