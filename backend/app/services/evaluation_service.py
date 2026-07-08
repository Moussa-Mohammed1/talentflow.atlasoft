from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.models.evaluation_result import EvaluationResult
from app.models.experience import Experience
from app.models.department import Department
from app.models.department_skill import DepartmentSkills
from app.models.candidat_skill import CandidatSkills
from app.models.skills import Skills
from app.models.candidat_language import CandidatLanguages
from app.models.resume import Resume
from app.models.user import User
from app.repositories.evaluation_repository import EvaluationRepository
from app.schemas.evaluate import (
    DepartmentEvaluation,
    DepartmentScore,
    EvaluateResponse,
    EvaluatedCandidateCard,
    RequirementScore,
    TalentCard,
)
from app.services.resume_service import resolve_stored_resume_path

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


class EvaluationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.eval_repo = EvaluationRepository(db)

    # ------------------------------------------------------------------
    # Retrieve stored results
    # ------------------------------------------------------------------
    def get_results(self, candidate_id: int) -> list[DepartmentEvaluation]:
        records = self.eval_repo.get_by_candidate(candidate_id)
        dept_names = {
            d.id: d.name
            for d in self.db.query(Department).filter(
                Department.id.in_([r.department_id for r in records])
            ).all()
        } if records else {}
        return [
            DepartmentEvaluation(
                department_id=r.department_id,
                department_name=dept_names.get(r.department_id, ""),
                compatibility=r.compatibility,
                requirements=[
                    RequirementScore(**req) for req in (r.requirements or [])
                ] if r.requirements else [],
                missing_experiences=r.missing_experiences or [],
                candidate_extra_experiences=r.candidate_extra_experiences or [],
            )
            for r in records
        ]

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------
    SKILL_CREDIT_YEARS = 1.0

    def evaluate(self, candidate_id: int) -> EvaluateResponse:
        candidate = self._load_candidate(candidate_id)
        if candidate is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidat introuvable",
            )

        candidate_experiences = self._load_candidate_experiences(candidate_id)
        candidate_skills = self._load_candidate_skills(candidate_id)
        departments = self._load_all_departments_with_skills()

        experience_map = self._build_experience_map(candidate_experiences)
        skill_map = self._build_skill_map(candidate_skills)

        combined_map = {**experience_map}
        for skill_name, years in skill_map.items():
            combined_map[skill_name] = max(combined_map.get(skill_name, 0.0), years)

        evaluations: list[DepartmentEvaluation] = []
        for dept, skills in departments:
            evaluation = self._evaluate_department(dept, skills, combined_map)
            evaluations.append(evaluation)

        evaluations.sort(key=lambda e: e.compatibility, reverse=True)

        evaluations = self._llm_validate(candidate, evaluations)

        self._persist_results(candidate_id, evaluations)

        return EvaluateResponse(
            candidate={
                "id": candidate.id,
                "fullname": candidate.fullname,
                "email": candidate.email,
            },
            evaluations=evaluations,
        )

    # ------------------------------------------------------------------
    # Get evaluated candidates with stats
    # ------------------------------------------------------------------
    def get_evaluated_candidates(self) -> list[EvaluatedCandidateCard]:
        evaluated_ids = (
            self.db.query(EvaluationResult.candidate_id)
            .distinct()
            .all()
        )
        if not evaluated_ids:
            return []

        candidate_ids = [row[0] for row in evaluated_ids]
        candidates = (
            self.db.query(Candidat)
            .filter(Candidat.id.in_(candidate_ids))
            .all()
        )

        result: list[EvaluatedCandidateCard] = []
        for candidate in candidates:
            skills_count = (
                self.db.query(CandidatSkills)
                .filter(CandidatSkills.candidat_id == candidate.id)
                .count()
            )
            languages_count = (
                self.db.query(CandidatLanguages)
                .filter(CandidatLanguages.candidat_id == candidate.id)
                .count()
            )
            experiences = (
                self.db.query(Experience)
                .filter(Experience.candidat_id == candidate.id)
                .all()
            )
            total_years = sum(
                self._compute_years(exp.start_date, exp.end_date)
                for exp in experiences
            )

            resume = (
                self.db.query(Resume)
                .filter(Resume.id == candidate.resume_id)
                .first()
            )
            resume_id = resume.id if resume else 0

            last_eval = (
                self.db.query(EvaluationResult.created_at)
                .filter(EvaluationResult.candidate_id == candidate.id)
                .order_by(EvaluationResult.created_at.desc())
                .first()
            )

            result.append(
                EvaluatedCandidateCard(
                    candidate_id=candidate.id,
                    resume_id=resume_id,
                    fullname=candidate.fullname,
                    photo=candidate.photo,
                    preview_url=f"/resumes/{resume_id}/preview",
                    skills_count=skills_count,
                    total_experience_years=round(total_years, 1),
                    languages_count=languages_count,
                    last_evaluation_date=(
                        last_eval[0].isoformat() if last_eval else ""
                    ),
                    is_talent=candidate.is_talent,
                )
            )

        result.sort(key=lambda c: c.last_evaluation_date, reverse=True)
        return result

    def get_talents(self) -> list[TalentCard]:
        talent_candidates = (
            self.db.query(Candidat)
            .filter(Candidat.is_talent == True)
            .all()
        )
        if not talent_candidates:
            return []

        result: list[TalentCard] = []
        for candidate in talent_candidates:
            best_eval = (
                self.db.query(
                    EvaluationResult.compatibility,
                    EvaluationResult.department_id,
                )
                .filter(EvaluationResult.candidate_id == candidate.id)
                .order_by(EvaluationResult.compatibility.desc())
                .first()
            )

            highest_score = round(best_eval[0], 2) if best_eval else 0.0
            best_department_name = ""
            if best_eval:
                dept = (
                    self.db.query(Department)
                    .filter(Department.id == best_eval[1])
                    .first()
                )
                best_department_name = dept.name if dept else ""

            recruiter_name = None
            if candidate.talent_recruiter_id:
                recruiter = (
                    self.db.query(User)
                    .filter(User.id == candidate.talent_recruiter_id)
                    .first()
                )
                recruiter_name = recruiter.fullname if recruiter else None

            resume = (
                self.db.query(Resume)
                .filter(Resume.id == candidate.resume_id)
                .first()
            )
            resume_id = resume.id if resume else 0

            result.append(
                TalentCard(
                    candidate_id=candidate.id,
                    resume_id=resume_id,
                    fullname=candidate.fullname,
                    photo=candidate.photo,
                    preview_url=f"/resumes/{resume_id}/preview",
                    highest_score=highest_score,
                    best_department_name=best_department_name,
                    talent_date=candidate.talent_date.isoformat() if candidate.talent_date else None,
                    talent_recruiter_name=recruiter_name,
                )
            )

        return result

    def get_department_scores(self, candidate_id: int) -> list[DepartmentScore]:
        results = (
            self.db.query(
                EvaluationResult.department_id,
                EvaluationResult.compatibility,
            )
            .filter(EvaluationResult.candidate_id == candidate_id)
            .all()
        )
        scores: list[DepartmentScore] = []
        for dept_id, compat in results:
            dept = self.db.query(Department).filter(Department.id == dept_id).first()
            scores.append(
                DepartmentScore(
                    department_id=dept_id,
                    department_name=dept.name if dept else "Unknown",
                    compatibility=round(compat, 2),
                )
            )
        return scores

    # ------------------------------------------------------------------
    # LLM validation
    # ------------------------------------------------------------------
    def _llm_validate(
        self,
        candidate: Candidat,
        evaluations: list[DepartmentEvaluation],
    ) -> list[DepartmentEvaluation]:
        if load_dotenv is not None:
            load_dotenv(Path(__file__).resolve().parents[2] / ".env")

        provider = (
            os.getenv("TALENTFLOW_EVALUATION_LLM_PROVIDER")
            or os.getenv("TALENTFLOW_SKILL_LLM_PROVIDER")
            or ""
        ).strip().casefold()

        if provider not in {"ollama", "qwen", "qwen3", "local", "local_qwen", "gemini", "gemini_flash", "deepseek"}:
            return evaluations

        try:
            resume = self.db.query(Resume).filter(Resume.id == candidate.resume_id).first()
            if resume is None or not resume.path:
                return evaluations
            file_path = str(resolve_stored_resume_path(resume.path))
            if not os.path.exists(file_path):
                return evaluations
        except Exception:
            return evaluations

        try:
            from app.services.LLM.validate_evaluation import LLMService

            serialized = [e.model_dump() for e in evaluations]
            payload = LLMService.validate(file_path, serialized)
        except Exception as exc:
            print(f"Evaluation LLM validation failed: {exc}", flush=True)
            return evaluations

        corrected = payload.get("evaluations", [])
        if not corrected:
            return evaluations

        dept_map: dict[str, DepartmentEvaluation] = {}
        for e in evaluations:
            dept_map[e.department_name] = e

        result: list[DepartmentEvaluation] = []
        for item in corrected:
            name = str(item.get("department_name", "")).strip()
            original = dept_map.get(name)
            if original is None:
                continue
            requirements = [
                RequirementScore(
                    experience=r.get("experience", ""),
                    required_years=r.get("required_years", 0),
                    candidate_years=float(r.get("candidate_years", 0.0)),
                    score=float(r.get("score", 0.0)),
                    matched=bool(r.get("matched", False)),
                )
                for r in item.get("requirements", [])
                if isinstance(r, dict)
            ]
            compat = float(item.get("compatibility", original.compatibility))
            result.append(DepartmentEvaluation(
                department_id=original.department_id,
                department_name=name,
                compatibility=round(compat, 2),
                requirements=requirements or original.requirements,
                missing_experiences=[
                    s for s in item.get("missing_experiences", []) if isinstance(s, str)
                ] or original.missing_experiences,
                candidate_extra_experiences=[
                    s for s in item.get("candidate_extra_experiences", []) if isinstance(s, str)
                ] or original.candidate_extra_experiences,
            ))

        if result:
            result.sort(key=lambda e: e.compatibility, reverse=True)
            return result
        return evaluations

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def _persist_results(self, candidate_id: int, evaluations: list[DepartmentEvaluation]) -> None:
        for eval_ in evaluations:
            record = EvaluationResult(
                candidate_id=candidate_id,
                department_id=eval_.department_id,
                compatibility=eval_.compatibility,
                requirements=[r.model_dump() for r in eval_.requirements],
                missing_experiences=eval_.missing_experiences,
                candidate_extra_experiences=eval_.candidate_extra_experiences,
            )
            self.eval_repo.save_result(record)

    # ------------------------------------------------------------------
    # Data loading (efficient, minimises round-trips)
    # ------------------------------------------------------------------
    def _load_candidate(self, candidate_id: int) -> Candidat | None:
        return self.db.query(Candidat).filter(Candidat.id == candidate_id).first()

    def _load_candidate_experiences(self, candidate_id: int) -> list[Experience]:
        return (
            self.db.query(Experience)
            .filter(Experience.candidat_id == candidate_id)
            .all()
        )

    def _load_candidate_skills(self, candidate_id: int) -> list[Skills]:
        return (
            self.db.query(Skills)
            .join(CandidatSkills, CandidatSkills.skill_id == Skills.id)
            .filter(CandidatSkills.candidat_id == candidate_id)
            .all()
        )

    def _load_all_departments_with_skills(self) -> list[tuple[Department, list[DepartmentSkills]]]:
        departments = self.db.query(Department).all()
        if not departments:
            return []

        dept_ids = [d.id for d in departments]
        skills = (
            self.db.query(DepartmentSkills)
            .filter(DepartmentSkills.departement_id.in_(dept_ids))
            .all()
        )

        skill_map: dict[int, list[DepartmentSkills]] = {}
        for s in skills:
            skill_map.setdefault(s.departement_id, []).append(s)

        return [(d, skill_map.get(d.id, [])) for d in departments]

    # ------------------------------------------------------------------
    # Candidate experience helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _compute_years(start_date: datetime, end_date: datetime | None) -> float:
        end = end_date if end_date else datetime.utcnow()
        delta = end - start_date
        return max(0.0, delta.days / 365.25)

    @staticmethod
    def _build_experience_map(experiences: list[Experience]) -> dict[str, float]:
        experience_map: dict[str, float] = {}
        for exp in experiences:
            if not exp.title or not exp.title.strip():
                continue
            # Store original-cased title; matching is case-insensitive
            key = exp.title.strip()
            years = EvaluationService._compute_years(exp.start_date, exp.end_date)
            experience_map[key] = experience_map.get(key, 0.0) + years
        return experience_map

    @staticmethod
    def _build_skill_map(skills: list[Skills]) -> dict[str, float]:
        skill_map: dict[str, float] = {}
        for skill in skills:
            if not skill.name or not skill.name.strip():
                continue
            key = skill.name.strip()
            skill_map[key] = EvaluationService.SKILL_CREDIT_YEARS
        return skill_map

    # ------------------------------------------------------------------
    # Per-department evaluation
    # ------------------------------------------------------------------
    @staticmethod
    def _evaluate_department(
        dept: Department,
        skills: list[DepartmentSkills],
        experience_map: dict[str, float],
    ) -> DepartmentEvaluation:
        required_years = max(0, dept.required_exp_years)
        # Build a lowercase lookup for case-insensitive matching
        exp_map_lower: dict[str, float] = {k.lower(): v for k, v in experience_map.items()}

        requirement_scores: list[RequirementScore] = []
        missing: list[str] = []

        for skill in skills:
            if not skill.title or not skill.title.strip():
                continue
            skill_name = skill.title.strip()
            skill_lower = skill_name.lower()
            candidate_years = exp_map_lower.get(skill_lower, 0.0)

            if required_years > 0:
                score = min(candidate_years / required_years, 1.0) * 100
            else:
                score = 100.0 if candidate_years > 0 else 0.0

            matched = candidate_years > 0

            requirement_scores.append(
                RequirementScore(
                    experience=skill_name,
                    required_years=required_years,
                    candidate_years=round(candidate_years, 2),
                    score=round(score, 2),
                    matched=matched,
                )
            )

            if not matched:
                missing.append(skill_name)

        # Compatibility = average of all requirement scores
        if requirement_scores:
            compatibility = sum(r.score for r in requirement_scores) / len(requirement_scores)
        else:
            compatibility = 0.0

        # Extra experiences the candidate has but department does not require
        required_lower = {s.title.strip().lower() for s in skills if s.title and s.title.strip()}
        extra = [
            k
            for k, v in sorted(experience_map.items(), key=lambda x: x[1], reverse=True)
            if k.lower() not in required_lower
        ]

        return DepartmentEvaluation(
            department_id=dept.id,
            department_name=dept.name,
            compatibility=round(compatibility, 2),
            requirements=requirement_scores,
            missing_experiences=sorted(missing),
            candidate_extra_experiences=extra,
        )
