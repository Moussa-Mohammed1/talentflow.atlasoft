from __future__ import annotations

import re
import unicodedata


class IdentityPreprocessor:
    @staticmethod
    def _normalize_unicode(text: str) -> str:
        text = unicodedata.normalize("NFKC", text)
        text = text.replace("\u00a0", " ").replace("\u200b", " ").replace("\ufeff", " ")
        return text

    @staticmethod
    def _merge_spaced_letters(text: str) -> str:
        def replace(match: re.Match[str]) -> str:
            letters = re.sub(r"\s+", "", match.group(0))
            if len(letters) <= 1:
                return match.group(0)
            if letters.isupper():
                return letters
            if letters[0].isupper():
                return letters[0].upper() + letters[1:].lower()
            return letters

        return re.sub(r"(?:\b[A-Za-zÀ-ÿ]\b(?:\s+|[-·•])?){3,}", replace, text)

    @staticmethod
    def _fix_broken_lines(text: str) -> str:
        text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)
        text = re.sub(r"\r\n", "\n", text)
        return text

    @staticmethod
    def _collapse_whitespace(text: str) -> str:
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def clean(self, text: str) -> tuple[str, list[str], list[str]]:
        text = self._normalize_unicode(text or "")
        text = self._fix_broken_lines(text)
        text = self._merge_spaced_letters(text)
        lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
        lines = [line for line in lines if line]
        clean_text = self._collapse_whitespace(text)
        return clean_text, lines, clean_text.splitlines()
