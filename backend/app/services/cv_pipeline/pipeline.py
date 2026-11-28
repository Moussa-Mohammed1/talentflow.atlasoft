from __future__ import annotations

from sqlalchemy.orm import Session

from app.schemas.certification_extraction import ResumeCertificationAnalysisRead
from app.schemas.cv_pipeline import StructuredCVProfile
from app.schemas.education_extraction import ResumeEducationAnalysisRead
from app.schemas.experience_extraction import ResumeExperienceAnalysisRead
from app.schemas.language_extraction import ResumeLanguageAnalysisRead
from app.schemas.skill_extraction import ResumeSkillAnalysisRead, SkillItemRead
from app.services.certification_extraction.pipeline import PretrainedBilingualCertificationExtractor
from app.services.cv_pipeline.normalizer import CVAttributeNormalizer
from app.services.cv_pipeline.spacy_ner import SpacyNERExtractor
from app.services.education_extraction.pipeline import PretrainedBilingualEducationExtractor
from app.services.experience_extraction.pipeline import PretrainedBilingualExperienceExtractor
from app.services.identity_extraction.pipeline import ResumeIdentityPipeline
from app.services.language_extraction.pipeline import ResumeLanguageExtractionPipeline
from app.services.resume.skill_mapper import SkillMapper
from app.services.resume_extraction.extractor import TextExtractionService
from app.services.resume_extraction.models import ParsedDocument
from app.services.skill_extraction.pipeline import PretrainedBilingualExtractor


class StructuredCVPipeline:
    """End-to-end modular CV ingestion pipeline producing a validated StructuredCVProfile."""

    def __init__(
        self,
        db: Session | None = None,
        recruiter_id: int | None = None,
        text_extractor: TextExtractionService | None = None,
        ner_extractor: SpacyNERExtractor | None = None,
        normalizer: CVAttributeNormalizer | None = None,
    ) -> None:
        self.db = db
        self.recruiter_id = recruiter_id
        self.text_extractor = text_extractor or TextExtractionService()
        self.ner_extractor = ner_extractor or SpacyNERExtractor()
        self.normalizer = normalizer or CVAttributeNormalizer()

    def parse_document(self, file_path: str) -> ParsedDocument:
        return self.text_extractor.extract_document(file_path)

    def extract_from_text(
        self,
        raw_text: str,
        *,
        file_path: str = "",
        parser_used: str = "text",
        file_type: str = "text",
        extract_identity: bool = True,
    ) -> tuple[
        StructuredCVProfile,
        ResumeSkillAnalysisRead,
        ResumeExperienceAnalysisRead,
        ResumeEducationAnalysisRead,
        ResumeCertificationAnalysisRead,
        ResumeLanguageAnalysisRead,
    ]:
        ner_summary = self.ner_extractor.extract(raw_text)

        identity_dict = {}
        if extract_identity:
            identity_dict = ResumeIdentityPipeline().analyze(
                raw_text, db=self.db, recruiter_id=self.recruiter_id
            )

        skills_raw = PretrainedBilingualExtractor(
            db=self.db, recruiter_id=self.recruiter_id
        ).extract_skills(raw_text)
        converted_skills = SkillMapper.convert_skills(skills_raw)
        skill_analysis = ResumeSkillAnalysisRead.model_validate(converted_skills)

        exp_raw = PretrainedBilingualExperienceExtractor(
            db=self.db, recruiter_id=self.recruiter_id
        ).extract_experiences(raw_text)
        exp_analysis = ResumeExperienceAnalysisRead.model_validate({
            "sections": exp_raw.get("sections", []),
            "experiences": exp_raw.get("experiences", []),
            "stats": exp_raw.get("stats", {}),
        })

        edu_raw = PretrainedBilingualEducationExtractor(
            db=self.db, recruiter_id=self.recruiter_id
        ).extract_education(file_path, raw_text)
        edu_analysis = ResumeEducationAnalysisRead.model_validate({
            "sections": edu_raw.get("sections", []),
            "educations": edu_raw.get("educations", []),
            "stats": edu_raw.get("stats", {}),
        })

        cert_raw = PretrainedBilingualCertificationExtractor(
            db=self.db, recruiter_id=self.recruiter_id
        ).extract_certifications(raw_text)
        cert_analysis = ResumeCertificationAnalysisRead.model_validate({
            "sections": cert_raw.get("sections", []),
            "certifications": cert_raw.get("certifications", []),
            "stats": cert_raw.get("stats", {}),
        })

        lang_raw = ResumeLanguageExtractionPipeline().extract_languages(raw_text)
        lang_analysis = ResumeLanguageAnalysisRead.model_validate({
            "sections": lang_raw.get("sections", []),
            "languages": lang_raw.get("languages", []),
            "stats": lang_raw.get("stats", {}),
        })

        raw_skill_items: list[SkillItemRead] = (
            skill_analysis.technologies + skill_analysis.competencies
        )
        norm_skills = self.normalizer.normalize_skills(raw_skill_items)
        norm_experiences = self.normalizer.normalize_experiences(exp_analysis.experiences)
        norm_educations = self.normalizer.normalize_educations(edu_analysis.educations)
        norm_certifications = self.normalizer.normalize_certifications(cert_analysis.certifications)
        norm_languages = self.normalizer.normalize_languages(lang_analysis.languages)

        fullname = str((identity_dict.get("name") or {}).get("full_name") or "")
        email = str((identity_dict.get("email") or {}).get("value") or "")
        phone = str((identity_dict.get("phone") or {}).get("value") or "")

        identity_attrs = self.normalizer.build_identity_attributes(
            fullname=fullname,
            email=email,
            phone=phone,
            ner=ner_summary,
            experiences=norm_experiences,
            skills=norm_skills,
        )

        profile = StructuredCVProfile(
            raw_text=raw_text,
            cleaned_text=raw_text,
            parser_used=parser_used,
            file_type=file_type,
            identity=identity_attrs,
            skills=norm_skills,
            experiences=norm_experiences,
            educations=norm_educations,
            certifications=norm_certifications,
            languages=norm_languages,
            ner=ner_summary,
            stats={
                "normalized_skills_count": len(norm_skills),
                "experiences_count": len(norm_experiences),
                "educations_count": len(norm_educations),
                "certifications_count": len(norm_certifications),
                "languages_count": len(norm_languages),
                "spacy_model": ner_summary.spacy_model,
            },
        )
        return (
            profile,
            skill_analysis,
            exp_analysis,
            edu_analysis,
            cert_analysis,
            lang_analysis,
        )

    def extract_from_file(self, file_path: str, *, extract_identity: bool = True) -> StructuredCVProfile:
        parsed = self.parse_document(file_path)
        profile, *_ = self.extract_from_text(
            parsed.cleaned_text,
            file_path=file_path,
            parser_used=parsed.parser_used,
            file_type=parsed.file_type,
            extract_identity=extract_identity,
        )
        profile.raw_text = parsed.raw_text
        profile.cleaned_text = parsed.cleaned_text
        return profile
