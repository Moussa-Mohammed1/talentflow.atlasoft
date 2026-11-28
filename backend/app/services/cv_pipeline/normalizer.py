from __future__ import annotations

from datetime import datetime, timezone
import re
from typing import Iterable

from app.schemas.certification_extraction import CertificationItemRead
from app.schemas.cv_pipeline import (
    CandidateIdentityAttributesSchema,
    NERExtractionSummary,
    NormalizedCertificationSchema,
    NormalizedEducationSchema,
    NormalizedExperienceSchema,
    NormalizedLanguageSchema,
    NormalizedSkillSchema,
)
from app.schemas.education_extraction import EducationItemRead
from app.schemas.experience_extraction import ExperienceItemRead
from app.schemas.language_extraction import LanguageMentionRead
from app.schemas.skill_extraction import SkillItemRead
from app.services.skill_extraction.ontology import SkillOntology

_DEGREE_ALIASES: tuple[tuple[tuple[str, ...], str], ...] = (
    (("phd", "ph.d", "doctorat", "doctorate"), "Doctorate"),
    (("master", "m.sc", "msc", "mba", "ingéni", "ingenieur", "engineer's degree", "bac+5", "bac +5"), "Master"),
    (("bachelor", "b.sc", "bsc", "licence", "bac+3", "bac +3"), "Bachelor"),
    (("associate", "dut", "bts", "deug", "bac+2", "bac +2"), "Associate"),
    (("high school", "baccalauréat", "baccalaureat", "lycée"), "High School"),
)

_LANGUAGE_ALIASES: dict[str, str] = {
    "en": "English",
    "eng": "English",
    "english": "English",
    "anglais": "English",
    "fr": "French",
    "fra": "French",
    "french": "French",
    "francais": "French",
    "français": "French",
    "ar": "Arabic",
    "arabic": "Arabic",
    "arabe": "Arabic",
    "es": "Spanish",
    "spanish": "Spanish",
    "espagnol": "Spanish",
    "de": "German",
    "german": "German",
    "allemand": "German",
    "it": "Italian",
    "italian": "Italian",
    "italien": "Italian",
    "pt": "Portuguese",
    "portuguese": "Portuguese",
    "portugais": "Portuguese",
}


class CVAttributeNormalizer:
    """Normalizes candidate attributes, skills, experiences, education, and languages before persistence."""

    def __init__(self, ontology: SkillOntology | None = None) -> None:
        if ontology is None:
            from app.workers.model_registry import get_shared_ontology

            ontology = get_shared_ontology(preload_embeddings=False)
        self.ontology = ontology

    def normalize_skill_name(self, name: str) -> str:
        cleaned = self.ontology.clean_surface(name)
        if not cleaned:
            return ""
        return self.ontology.normalize(cleaned)

    def normalize_skill_key(self, name: str) -> str:
        return self.ontology.normalize_key(self.normalize_skill_name(name))

    def normalize_skills(self, skills: Iterable[SkillItemRead | dict]) -> list[NormalizedSkillSchema]:
        merged: dict[str, NormalizedSkillSchema] = {}
        for item in skills:
            if isinstance(item, dict):
                raw_name = str(item.get("original") or item.get("name") or item.get("normalized") or "").strip()
                category = str(item.get("category") or "Technology").strip() or "Technology"
                confidence = float(item.get("confidence", 0.7) or 0.7)
                section = str(item.get("section") or "unknown").strip() or "unknown"
                raw_sources = item.get("sources") or ([item["source"]] if item.get("source") else [])
                sources = [str(s).strip() for s in raw_sources if str(s).strip()]
            else:
                raw_name = (item.original or item.name or item.normalized).strip()
                category = (item.category or "Technology").strip() or "Technology"
                confidence = float(item.confidence)
                section = (item.section or "unknown").strip() or "unknown"
                sources = [s.strip() for s in (item.source or "").split(",") if s.strip()]

            if not raw_name:
                continue

            canonical = self.normalize_skill_name(raw_name)
            key = self.ontology.normalize_key(canonical)
            if not key:
                continue

            resolved_cat, _, _ = self.ontology.category_for(canonical, section=section, semantic_hint=confidence)
            final_category = resolved_cat if resolved_cat else category

            candidate = NormalizedSkillSchema(
                raw_name=raw_name,
                canonical_name=canonical,
                normalized_key=key,
                category=final_category,
                confidence=round(min(max(confidence, 0.0), 1.0), 4),
                section=section,
                sources=sorted(set(sources)),
            )

            existing = merged.get(key)
            if existing is None:
                merged[key] = candidate
            else:
                best = candidate if candidate.confidence > existing.confidence else existing
                merged[key] = NormalizedSkillSchema(
                    raw_name=best.raw_name,
                    canonical_name=best.canonical_name,
                    normalized_key=key,
                    category=best.category,
                    confidence=max(existing.confidence, candidate.confidence),
                    section=best.section,
                    sources=sorted({*existing.sources, *candidate.sources}),
                )

        return sorted(merged.values(), key=lambda s: (-s.confidence, s.canonical_name.casefold()))

    @staticmethod
    def normalize_degree(degree: str | None) -> str | None:
        if not degree or not degree.strip():
            return None
        lowered = degree.strip().casefold()
        for tokens, canonical in _DEGREE_ALIASES:
            if any(tok in lowered for tok in tokens):
                return canonical
        return " ".join(degree.split())

    @staticmethod
    def normalize_language_name(name: str) -> str:
        cleaned = " ".join(name.split()).strip()
        if not cleaned:
            return ""
        mapped = _LANGUAGE_ALIASES.get(cleaned.casefold())
        if mapped:
            return mapped
        return cleaned[:1].upper() + cleaned[1:]

    @staticmethod
    def normalize_phone(phone: str | None) -> str:
        if not phone:
            return ""
        cleaned = re.sub(r"[^\d+]", "", phone.strip())
        if cleaned.startswith("00"):
            cleaned = "+" + cleaned[2:]
        return cleaned if cleaned else phone.strip()

    @staticmethod
    def normalize_location(location: str | None) -> str | None:
        if not location or not location.strip():
            return None
        cleaned = " ".join(location.split()).strip(" ,;|•-")
        if not cleaned:
            return None
        return ", ".join(part.strip().title() if part.strip().islower() else part.strip() for part in cleaned.split(","))

    @staticmethod
    def normalize_role(role: str | None) -> str | None:
        if not role or not role.strip():
            return None
        cleaned = " ".join(role.split()).strip(" ,;|•-")
        return cleaned[:160] if cleaned else None

    @staticmethod
    def compute_experience_duration_years(
        experiences: Iterable[ExperienceItemRead | NormalizedExperienceSchema],
        *,
        reference_now: datetime | None = None,
    ) -> float:
        """Compute non-overlapping total years of experience from dated experience entries."""
        now = reference_now or datetime.now(timezone.utc).replace(tzinfo=None)
        intervals: list[tuple[datetime, datetime]] = []
        for exp in experiences:
            start = exp.start_date
            if start is None:
                continue
            start_naive = start.replace(tzinfo=None) if start.tzinfo else start
            end_raw = exp.end_date or now
            end_naive = end_raw.replace(tzinfo=None) if end_raw.tzinfo else end_raw
            if end_naive < start_naive:
                continue
            intervals.append((start_naive, end_naive))

        if not intervals:
            return 0.0

        intervals.sort(key=lambda pair: pair[0])
        merged: list[list[datetime]] = [[intervals[0][0], intervals[0][1]]]
        for start, end in intervals[1:]:
            if start <= merged[-1][1]:
                if end > merged[-1][1]:
                    merged[-1][1] = end
            else:
                merged.append([start, end])

        total_days = sum((end - start).days for start, end in merged)
        return round(max(0.0, total_days / 365.25), 2)

    def normalize_experiences(
        self,
        experiences: Iterable[ExperienceItemRead],
        *,
        reference_now: datetime | None = None,
    ) -> list[NormalizedExperienceSchema]:
        now = reference_now or datetime.now(timezone.utc).replace(tzinfo=None)
        normalized: list[NormalizedExperienceSchema] = []
        for exp in experiences:
            title = " ".join((exp.title or "").split()).strip()
            if not title:
                continue
            duration = 0.0
            if exp.start_date is not None:
                start_n = exp.start_date.replace(tzinfo=None) if exp.start_date.tzinfo else exp.start_date
                end_raw = exp.end_date or now
                end_n = end_raw.replace(tzinfo=None) if end_raw.tzinfo else end_raw
                if end_n >= start_n:
                    duration = round((end_n - start_n).days / 365.25, 2)
            normalized.append(
                NormalizedExperienceSchema(
                    title=title,
                    normalized_title=title,
                    description=exp.description.strip() if exp.description else None,
                    start_date=exp.start_date,
                    end_date=exp.end_date,
                    duration_years=duration,
                    confidence=round(float(exp.confidence), 4),
                )
            )
        return normalized

    def normalize_educations(self, educations: Iterable[EducationItemRead]) -> list[NormalizedEducationSchema]:
        result: list[NormalizedEducationSchema] = []
        for edu in educations:
            inst = " ".join((edu.institution or "").split()).strip()
            if not inst:
                continue
            result.append(
                NormalizedEducationSchema(
                    institution=inst,
                    degree=edu.degree.strip() if edu.degree else None,
                    normalized_degree=self.normalize_degree(edu.degree),
                    field_of_study=edu.field_of_study.strip() if edu.field_of_study else None,
                    start_date=edu.start_date,
                    end_date=edu.end_date,
                    description=edu.description.strip() if edu.description else None,
                    confidence=round(float(edu.confidence), 4),
                )
            )
        return result

    def normalize_certifications(
        self, certifications: Iterable[CertificationItemRead]
    ) -> list[NormalizedCertificationSchema]:
        result: list[NormalizedCertificationSchema] = []
        for cert in certifications:
            name = " ".join((cert.name or "").split()).strip()
            if not name:
                continue
            result.append(
                NormalizedCertificationSchema(
                    name=name,
                    organization=cert.organization.strip() if cert.organization else None,
                    issue_date=cert.issue_date,
                    expiration_date=cert.expiration_date,
                    credential_id=cert.credential_id.strip() if cert.credential_id else None,
                    credential_url=cert.credential_url.strip() if cert.credential_url else None,
                    description=cert.description.strip() if cert.description else None,
                    confidence=round(float(cert.confidence), 4),
                )
            )
        return result

    def normalize_languages(self, languages: Iterable[LanguageMentionRead]) -> list[NormalizedLanguageSchema]:
        merged: dict[str, NormalizedLanguageSchema] = {}
        for lang in languages:
            raw = " ".join((lang.language or "").split()).strip()
            if not raw:
                continue
            norm = self.normalize_language_name(raw)
            key = norm.casefold()
            prof = lang.proficiency.level.strip() if lang.proficiency and lang.proficiency.level else None
            entry = NormalizedLanguageSchema(
                name=raw,
                normalized_name=norm,
                proficiency=prof or None,
                confidence=round(min(max(float(lang.confidence), 0.0), 1.0), 4),
            )
            existing = merged.get(key)
            if existing is None or entry.confidence > existing.confidence:
                merged[key] = entry
        return sorted(merged.values(), key=lambda lang: (-lang.confidence, lang.normalized_name.casefold()))

    def build_identity_attributes(
        self,
        *,
        fullname: str,
        email: str,
        phone: str,
        ner: NERExtractionSummary,
        experiences: list[NormalizedExperienceSchema],
        skills: list[NormalizedSkillSchema],
    ) -> CandidateIdentityAttributesSchema:
        clean_name = " ".join((fullname or "").split()).strip()
        if not clean_name and ner.persons:
            clean_name = ner.persons[0]

        clean_email = (email or "").strip().lower()
        clean_phone = self.normalize_phone(phone)

        role = ner.roles[0] if ner.roles else (experiences[0].normalized_title if experiences else None)
        current_role = self.normalize_role(role)
        location = self.normalize_location(ner.locations[0] if ner.locations else None)
        total_years = self.compute_experience_duration_years(experiences)

        summary_parts: list[str] = []
        if current_role:
            summary_parts.append(current_role)
        if total_years > 0:
            summary_parts.append(f"{total_years:.1f} years experience")
        if location:
            summary_parts.append(f"based in {location}")
        if skills:
            top_skills = ", ".join(s.canonical_name for s in skills[:8])
            summary_parts.append(f"Skills: {top_skills}")

        summary = " | ".join(summary_parts) if summary_parts else None

        return CandidateIdentityAttributesSchema(
            fullname=clean_name,
            email=clean_email,
            phone=clean_phone,
            current_role=current_role,
            location=location,
            summary=summary,
            total_experience_years=total_years,
        )
