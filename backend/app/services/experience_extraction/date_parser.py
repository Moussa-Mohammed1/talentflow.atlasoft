from __future__ import annotations

import calendar
import re
import unicodedata
from datetime import datetime

from app.services.experience_extraction.models import ParsedDateRange


class BilingualDateRangeParser:
    _MONTHS = {
        "jan": 1, "january": 1, "janvier": 1,
        "feb": 2, "february": 2, "fev": 2, "fevrier": 2,
        "mar": 3, "march": 3, "mars": 3,
        "apr": 4, "april": 4, "avr": 4, "avril": 4,
        "may": 5, "mai": 5,
        "jun": 6, "june": 6, "juin": 6,
        "jul": 7, "july": 7, "juil": 7, "juillet": 7,
        "aug": 8, "august": 8, "aout": 8,
        "sep": 9, "sept": 9, "september": 9, "septembre": 9,
        "oct": 10, "october": 10, "octobre": 10,
        "nov": 11, "november": 11, "novembre": 11,
        "dec": 12, "december": 12, "decembre": 12,
    }
    _PRESENT = r"present|current|now|today|aujourd'hui|actuel(?:le)?|en cours|jusqu'a present"
    _MONTH = "|".join(sorted(_MONTHS, key=len, reverse=True))
    _MONTH_YEAR = rf"(?:{_MONTH})\.?\s+\d{{4}}"
    _NUMERIC_MONTH_YEAR = r"(?:0?[1-9]|1[0-2])[/.]\d{4}"
    _YEAR = r"(?:19|20)\d{2}"
    _DATE = rf"(?:{_MONTH_YEAR}|{_NUMERIC_MONTH_YEAR}|{_YEAR})"
    _END_DATE = rf"(?:{_DATE}|{_PRESENT})"
    _RANGE = re.compile(
        rf"(?P<start>{_DATE})\s*(?:-|\bto\b|\bau\b|\ba\b|\buntil\b)\s*(?P<end>{_END_DATE})",
        re.IGNORECASE,
    )

    @staticmethod
    def _normalize(value: str) -> str:
        stripped = "".join(
            character
            for character in unicodedata.normalize("NFKD", value)
            if not unicodedata.combining(character)
        )
        return (
            stripped.casefold()
            .replace("\u2013", "-")
            .replace("\u2014", "-")
            .replace("\u2212", "-")
        )

    def _parse_date(self, value: str, *, range_end: bool = False) -> datetime | None:
        value = value.strip().rstrip(".")
        if re.fullmatch(self._PRESENT, value, re.IGNORECASE):
            return None

        numeric = re.fullmatch(r"(0?[1-9]|1[0-2])[/.](\d{4})", value)
        if numeric:
            month, year = int(numeric.group(1)), int(numeric.group(2))
        else:
            year_match = re.search(r"((?:19|20)\d{2})$", value)
            if not year_match:
                return None
            year = int(year_match.group(1))
            month_text = value[:year_match.start()].strip().rstrip(".")
            month = self._MONTHS.get(month_text, 12 if range_end else 1)

        day = calendar.monthrange(year, month)[1] if range_end else 1
        return datetime(year, month, day)

    def find(self, text: str) -> ParsedDateRange | None:
        normalized = self._normalize(text)
        match = self._RANGE.search(normalized)
        if match is None:
            return None

        start_date = self._parse_date(match.group("start"))
        if start_date is None:
            return None
        end_value = match.group("end")
        end_date = self._parse_date(end_value, range_end=True)
        if end_date is not None and end_date < start_date:
            return None

        return ParsedDateRange(
            start_date=start_date,
            end_date=end_date,
            text=text[match.start():match.end()],
            start_index=match.start(),
            end_index=match.end(),
        )
