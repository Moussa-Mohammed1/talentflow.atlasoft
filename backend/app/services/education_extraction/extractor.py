from __future__ import annotations

import re

from app.services.education_extraction.models import EducationMention
from app.services.experience_extraction.date_parser import BilingualDateRangeParser
from app.services.skill_extraction.models import SectionSpan


class EducationBlockExtractor:
    _BULLET = re.compile(r"^\s*(?:[-*\u2022\u25e6\u25aa]|\d+[.)])\s*")
    _DATA_LINE = re.compile(r"(?i)^\s*(?:gpa|grade|score|mention|honors|honours|avg|rank)", re.IGNORECASE)
    _DEGREE_KEYWORDS = re.compile(
        r"(?i)(?:bachelor|master|phd|doctor|licence|license|dut|bts|mba|msc|bsc|ma|ba|"
        r"associate|diploma|certificate|formation|baccalaureat|bac\+?[0-9]|mastere|"
        r"ingenieur|engineer|doctorat|postgraduate|undergraduate)"
    )
    _INSTITUTION_KEYWORDS = re.compile(
        r"(?i)(?:university|universite|school|ecole|institute|institut|college|"
        r"college|academy|faculty|faculte|polytechnic|conservatoire)"
    )

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

    @staticmethod
    def _lookback_header_start(lines: list[str], date_index: int, previous_date: int) -> int:
        start = date_index
        for index in range(date_index - 1, max(previous_date, date_index - 3), -1):
            stripped = lines[index].strip()
            if not stripped or len(stripped) > 140:
                break
            start = index
        return start

    @classmethod
    def _lookahead_header_end(cls, lines: list[str], date_index: int, next_date: int) -> int:
        end = date_index + 1
        for index in range(date_index + 1, min(next_date, date_index + 3)):
            stripped = lines[index].strip()
            if not stripped or len(stripped) > 140:
                break
            if cls._DATA_LINE.match(stripped):
                break
            end = index + 1
        return end

    @classmethod
    def _extract_degree_and_institution(cls, header_lines: list[str]) -> tuple[str | None, str, str | None]:
        full_text = " | ".join(header_lines)
        degree = None
        field_of_study = None
        institution = full_text

        degree_match = re.search(r"(?i)(?:degree|diploma)\s*[:\-]\s*(.*)", full_text)
        if degree_match:
            degree = degree_match.group(1).strip()
            institution = institution.replace(degree_match.group(0), "").strip(" |,")

        field_match = re.search(r"(?i)(?:field of study|field|major|specialization|specialite|option|parcours)\s*[:\-]\s*(.*)", full_text)
        if field_match:
            field_of_study = field_match.group(1).strip()

        if not degree:
            lines_with_keywords = [l for l in header_lines if cls._DEGREE_KEYWORDS.search(l)]
            if lines_with_keywords:
                degree = " | ".join(lines_with_keywords)
                remaining = [l for l in header_lines if l not in lines_with_keywords]
                institution = " | ".join(remaining) if remaining else ""

        if not institution:
            institution = full_text

        institution = institution.strip(" |,") or full_text
        return degree, institution, field_of_study

    def extract(self, text: str, sections: list[SectionSpan]) -> tuple[list[EducationMention], int]:
        mentions: list[EducationMention] = []
        rejected = 0
        education_sections = [section for section in sections if section.name == "education"]
        search_sections = education_sections or [
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

            for position, (date_index, parsed) in enumerate(dated_lines):
                previous_date = dated_lines[position - 1][0] if position else -1
                next_date = dated_lines[position + 1][0] if position + 1 < len(dated_lines) else len(lines)

                same_line_header = lines[date_index][:parsed.start_index].strip(" |,-")

                header_lines_before = []
                if same_line_header:
                    header_lines_before.append(self._clean_line(same_line_header))
                else:
                    lookback_start = self._lookback_header_start(lines, date_index, previous_date)
                    header_lines_before = [
                        self._clean_line(line)
                        for line in lines[lookback_start:date_index]
                        if self._clean_line(line)
                    ]

                header_lines_after = []
                if not header_lines_before and not same_line_header:
                    lookahead_end = self._lookahead_header_end(lines, date_index, next_date)
                    header_lines_after = [
                        self._clean_line(line)
                        for line in lines[date_index + 1:lookahead_end]
                        if self._clean_line(line)
                    ]
                    content_end = lookahead_end
                else:
                    content_end = date_index + 1

                header_lines = header_lines_before + header_lines_after
                if not header_lines:
                    rejected += 1
                    continue

                degree, institution, field_of_study = self._extract_degree_and_institution(header_lines)

                description_end = next_date
                description_lines = [
                    self._clean_line(line)
                    for line in lines[content_end:description_end]
                    if self._clean_line(line)
                ]
                description = "\n".join(description_lines) or None

                if not institution:
                    rejected += 1
                    continue

                block_start = min(
                    self._lookback_header_start(lines, date_index, previous_date),
                    date_index,
                )
                evidence = [line.strip() for line in lines[block_start:description_end] if line.strip()]
                confidence = 0.60
                confidence += 0.12 if education_sections else 0.0
                confidence += 0.10 if degree else 0.0
                confidence += 0.08 if field_of_study else 0.0
                confidence += 0.05 if description else 0.0
                confidence += 0.05 if parsed.end_date is None else 0.0

                mentions.append(
                    EducationMention(
                        institution=institution,
                        degree=degree,
                        field_of_study=field_of_study,
                        start_date=parsed.start_date,
                        end_date=parsed.end_date,
                        description=description,
                        confidence=round(min(confidence, 0.97), 4),
                        section=section.name,
                        evidence=evidence,
                    )
                )

        return mentions, rejected
