from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.models.candidat_language import CandidatLanguages
from app.models.candidat_skill import CandidatSkills
from app.models.certification import Certification
from app.models.department import Department
from app.models.department_skill import DepartmentSkills
from app.models.education import Education
from app.models.experience import Experience
from app.models.job_offers import JobOffers
from app.models.language import Language
from app.models.skills import Skills


@dataclass(frozen=True)
class ProfileChunk:
    chunk_type: str
    chunk_index: int
    text: str


class CandidateChunkBuilder:
    """Builds semantically meaningful profile and section chunks for a candidate."""

    @staticmethod
    def build_chunks_from_db(db: Session, candidate_id: int) -> list[ProfileChunk]:
        candidat = db.query(Candidat).filter(Candidat.id == candidate_id).first()
        if candidat is None:
            return []

        skills = (
            db.query(Skills)
            .join(CandidatSkills, CandidatSkills.skill_id == Skills.id)
            .filter(CandidatSkills.candidat_id == candidate_id)
            .all()
        )
        experiences = (
            db.query(Experience)
            .filter(Experience.candidat_id == candidate_id)
            .all()
        )
        educations = (
            db.query(Education)
            .filter(Education.candidat_id == candidate_id)
            .all()
        )
        certifications = (
            db.query(Certification)
            .filter(Certification.candidat_id == candidate_id)
            .all()
        )
        languages = (
            db.query(Language)
            .join(CandidatLanguages, CandidatLanguages.language_id == Language.id)
            .filter(CandidatLanguages.candidat_id == candidate_id)
            .all()
        )

        chunks: list[ProfileChunk] = []

        skill_names = [s.name.strip() for s in skills if s.name and s.name.strip()]
        exp_lines = []
        for idx, exp in enumerate(experiences):
            title = (exp.title or "").strip()
            desc = (exp.description or "").strip()
            line = f"{title}: {desc}" if title and desc else (title or desc)
            if line:
                exp_lines.append(line)
                chunks.append(ProfileChunk(chunk_type="experience", chunk_index=idx, text=line))

        edu_lines = []
        for edu in educations:
            parts = [p.strip() for p in (edu.degree, edu.field_of_study, edu.institution) if p and p.strip()]
            if parts:
                edu_lines.append(" - ".join(parts))

        cert_names = [c.name.strip() for c in certifications if c.name and c.name.strip()]
        lang_names = [lang.name.strip() for lang in languages if lang.name and lang.name.strip()]

        if skill_names:
            chunks.append(
                ProfileChunk(
                    chunk_type="skills",
                    chunk_index=0,
                    text="Skills: " + ", ".join(skill_names),
                )
            )

        if edu_lines or cert_names:
            edu_text_parts = []
            if edu_lines:
                edu_text_parts.append("Education: " + "; ".join(edu_lines))
            if cert_names:
                edu_text_parts.append("Certifications: " + ", ".join(cert_names))
            chunks.append(
                ProfileChunk(
                    chunk_type="education",
                    chunk_index=0,
                    text=" | ".join(edu_text_parts),
                )
            )

        profile_parts: list[str] = []
        if candidat.fullname:
            profile_parts.append(f"Candidate: {candidat.fullname}")
        if candidat.current_role:
            profile_parts.append(f"Role: {candidat.current_role}")
        if candidat.location:
            profile_parts.append(f"Location: {candidat.location}")
        if candidat.total_experience_years:
            profile_parts.append(f"Experience: {candidat.total_experience_years:.1f} years")
        if candidat.summary:
            profile_parts.append(f"Summary: {candidat.summary}")
        if skill_names:
            profile_parts.append("Skills: " + ", ".join(skill_names))
        if exp_lines:
            profile_parts.append("Experiences: " + " ; ".join(exp_lines[:5]))
        if edu_lines:
            profile_parts.append("Education: " + " ; ".join(edu_lines[:3]))
        if cert_names:
            profile_parts.append("Certifications: " + ", ".join(cert_names))
        if lang_names:
            profile_parts.append("Languages: " + ", ".join(lang_names))

        profile_text = "\n".join(profile_parts).strip() or candidat.fullname or f"Candidate #{candidate_id}"
        chunks.insert(0, ProfileChunk(chunk_type="profile", chunk_index=0, text=profile_text))
        return chunks


class JobOfferTextBuilder:
    """Builds embedding-ready text from a JobOffers record and its department requirements."""

    @staticmethod
    def build_text(db: Session, job_offer: JobOffers) -> str:
        parts: list[str] = [f"Title: {job_offer.title}"]
        if job_offer.location:
            parts.append(f"Location: {job_offer.location}")
        if job_offer.seniority_level:
            level = getattr(job_offer.seniority_level, "value", job_offer.seniority_level)
            parts.append(f"Seniority: {level}")
        if job_offer.work_mode:
            mode = getattr(job_offer.work_mode, "value", job_offer.work_mode)
            parts.append(f"Work Mode: {mode}")
        if job_offer.required_experience_years is not None:
            parts.append(f"Required Experience: {job_offer.required_experience_years:.1f} years")

        if job_offer.department_id:
            dept = db.query(Department).filter(Department.id == job_offer.department_id).first()
            if dept:
                parts.append(f"Department: {dept.name} (min {dept.required_exp_years} years)")
            dept_skills = (
                db.query(DepartmentSkills)
                .filter(DepartmentSkills.departement_id == job_offer.department_id)
                .all()
            )
            titles = [ds.title.strip() for ds in dept_skills if ds.title and ds.title.strip()]
            if titles:
                parts.append("Required Skills: " + ", ".join(titles))

        if job_offer.description:
            parts.append(f"Description: {job_offer.description.strip()}")
        if job_offer.responsibilities:
            parts.append(f"Responsibilities: {job_offer.responsibilities.strip()}")

        return "\n".join(parts)
