from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.models.evaluation_result import EvaluationResult
from app.models.experience import Experience
from app.models.department import Department
from app.models.department_skill import DepartmentSkills
from app.models.candidat_skill import CandidatSkills
from app.models.candidat_language import CandidatLanguages
from app.models.resume import Resume
from app.repositories.evaluation_repository import EvaluationRepository
from app.schemas.evaluate import (
    DepartmentEvaluation,
    EvaluateResponse,
    EvaluatedCandidateCard,
    RequirementScore,
)


class EvaluationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.eval_repo = EvaluationRepository(db)

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------
    def evaluate(self, candidate_id: int) -> EvaluateResponse:
        candidate = self._load_candidate(candidate_id)
        if candidate is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found",
            )

        candidate_experiences = self._load_candidate_experiences(candidate_id)
        departments = self._load_all_departments_with_skills()

        experience_map = self._build_experience_map(candidate_experiences)

        evaluations: list[DepartmentEvaluation] = []
        for dept, skills in departments:
            evaluation = self._evaluate_department(dept, skills, experience_map)
            evaluations.append(evaluation)

        evaluations.sort(key=lambda e: e.compatibility, reverse=True)

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
                )
            )

        result.sort(key=lambda c: c.last_evaluation_date, reverse=True)
        return result

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
        end = end_date if end_date else datetime.now(timezone.utc)
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
