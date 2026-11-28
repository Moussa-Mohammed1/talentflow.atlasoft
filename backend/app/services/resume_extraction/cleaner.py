from __future__ import annotations

import re
import unicodedata


class TextCleaner:
    """Normalizes extracted CV text while preserving line structure for downstream parsers."""

    _ZERO_WIDTH_RE = re.compile(r"[\u200b-\u200f\u202a-\u202e\ufeff\u00ad]")
    _MULTI_HSPACE_RE = re.compile(r"[^\S\n\r\t]+")
    _MULTI_BLANK_LINES_RE = re.compile(r"\n{3,}")

    @classmethod
    def clean(cls, text: str) -> str:
        if not text:
            return ""

        normalized = unicodedata.normalize("NFKC", text)
        normalized = normalized.replace("\r\n", "\n").replace("\r", "\n").replace("\u00a0", " ")
        normalized = cls._ZERO_WIDTH_RE.sub("", normalized)

        cleaned_chars = [
            ch for ch in normalized if ch in {"\n", "\t"} or ch.isprintable()
        ]
        cleaned = "".join(cleaned_chars)

        lines = [
            cls._MULTI_HSPACE_RE.sub(" ", line).strip()
            for line in cleaned.split("\n")
        ]
        joined = "\n".join(lines)
        joined = cls._MULTI_BLANK_LINES_RE.sub("\n\n", joined)
        return joined.strip()
