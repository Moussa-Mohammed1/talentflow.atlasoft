from __future__ import annotations

import re

from app.services.identity_extraction.constants import EMAIL_PATTERN, PHONE_PATTERN
from app.services.identity_extraction.models import CandidateScore
from app.services.identity_extraction.validation import IdentityValidation


class ContactExtractor:
    def __init__(self, validation: IdentityValidation) -> None:
        self.validation = validation

    def _extract_email_candidates(self, text: str) -> list[CandidateScore]:
        candidates: list[CandidateScore] = []
        for match in EMAIL_PATTERN.finditer(text):
            email = self.validation.normalize_email(match.group(1))
            if self.validation.validate_email(email):
                position_bonus = max(0.5, 1.0 - (match.start() / max(len(text), 1)) * 0.4)
                candidates.append(CandidateScore(email, min(0.99, 0.72 + position_bonus * 0.25), [match.group(1)], {"position": position_bonus, "pattern": 1.0, "validation": 1.0}))
        return candidates

    def _extract_phone_candidates(self, text: str) -> list[CandidateScore]:
        candidates: list[CandidateScore] = []
        for match in PHONE_PATTERN.finditer(text):
            raw_phone = match.group(0).strip()
            if re.fullmatch(r"20\d{2}\s*-\s*20\d{2}", raw_phone):
                continue
            if re.fullmatch(r"\d{4}\s*-\s*\d{4}", raw_phone):
                continue
            if not self.validation.validate_phone(raw_phone):
                continue
            normalized = self.validation.normalize_phone(raw_phone, text)
            position_bonus = max(0.4, 1.0 - (match.start() / max(len(text), 1)) * 0.4)
            digits = re.sub(r"\D", "", raw_phone)
            pattern_score = 1.0 if raw_phone.startswith("+") else 0.78
            validation_score = 1.0 if len(digits) >= 8 else 0.0
            candidates.append(CandidateScore(normalized, min(0.98, 0.66 + position_bonus * 0.25), [raw_phone], {"position": position_bonus, "pattern": pattern_score, "validation": validation_score}))
        return candidates
