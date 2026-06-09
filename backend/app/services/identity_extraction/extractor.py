from __future__ import annotations

from typing import Any

from app.services.identity_extraction.contact_extractor import ContactExtractor
from app.services.identity_extraction.models import IdentityExtractionResult
from app.services.identity_extraction.name_extractor import NameExtractor
from app.services.identity_extraction.preprocess import IdentityPreprocessor
from app.services.identity_extraction.scorer import IdentityScorer
from app.services.identity_extraction.validation import IdentityValidation


class IdentityExtractor:
    def __init__(self) -> None:
        self.preprocessor = IdentityPreprocessor()
        self.validation = IdentityValidation()
        self.contact_extractor = ContactExtractor(self.validation)
        self.name_extractor = NameExtractor()
        self.scorer = IdentityScorer()

    def extract(self, text: str) -> IdentityExtractionResult:
        clean_text, lines, _ = self.preprocessor.clean(text)
        email_candidates = self.contact_extractor._extract_email_candidates(clean_text)
        phone_candidates = self.contact_extractor._extract_phone_candidates(clean_text)
        name = self.name_extractor.extract(lines, clean_text, email_candidates=email_candidates, phone_candidates=phone_candidates)

        email = self.scorer._best_candidate(email_candidates)
        phone = self.scorer._best_candidate(phone_candidates)

        stats = {
            "line_count": len(lines),
            "email_candidates": len(email_candidates),
            "phone_candidates": len(phone_candidates),
            "name_candidates": len(name.candidates),
            "name_score": name.score,
            "name_confidence": round(name.confidence, 4),
            "spacy_model": self.name_extractor.spacy_model_name,
        }

        return IdentityExtractionResult(name=name, email=email, phone=phone, stats=stats)


class ResumeIdentityExtractor:
    def __init__(self) -> None:
        self.extractor = IdentityExtractor()

    def extract_identity(self, text: str) -> dict[str, Any]:
        return self.extractor.extract(text).to_dict()
