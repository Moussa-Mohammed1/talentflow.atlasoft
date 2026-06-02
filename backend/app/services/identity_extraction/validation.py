from __future__ import annotations

import re

from app.services.identity_extraction.constants import EMAIL_PATTERN


class IdentityValidation:
    @staticmethod
    def validate_email(candidate: str) -> bool:
        match = EMAIL_PATTERN.fullmatch(candidate.strip())
        if not match:
            return False
        local_part, domain_part = candidate.rsplit("@", 1)
        if not local_part or not domain_part or "." not in domain_part:
            return False
        if domain_part.startswith(".") or domain_part.endswith("."):
            return False
        return True

    @staticmethod
    def normalize_email(candidate: str) -> str:
        return candidate.strip().lower()

    @staticmethod
    def _digits_only(candidate: str) -> str:
        return re.sub(r"\D", "", candidate)

    @classmethod
    def validate_phone(cls, candidate: str) -> bool:
        digits = cls._digits_only(candidate)
        if len(digits) < 8 or len(digits) > 15:
            return False
        if digits in {"0" * len(digits)}:
            return False
        if re.fullmatch(r"20\d{2}20\d{2}", digits):
            return False
        if re.fullmatch(r"20\d{2}202\d", digits):
            return False
        return True

    @classmethod
    def normalize_phone(cls, candidate: str, text: str) -> str:
        raw = candidate.strip()
        digits = cls._digits_only(raw)
        if not digits:
            return raw

        text_lower = text.casefold()
        if digits.startswith("212"):
            local = digits[3:]
            if len(local) == 9 and local.startswith("0"):
                local = local[1:]
            if len(local) == 9:
                grouped = f"+212 {local[0]} {local[1:3]} {local[3:5]} {local[5:7]} {local[7:9]}"
                return grouped

        if raw.startswith("+") and 8 <= len(digits) <= 15:
            return "+" + digits

        if digits.startswith("0") and len(digits) == 10 and ("morocco" in text_lower or "maroc" in text_lower or "+212" in text):
            local = digits[1:]
            return f"+212 {local[0]} {local[1:3]} {local[3:5]} {local[5:7]} {local[7:9]}"

        return "+" + digits if len(digits) >= 8 else raw
