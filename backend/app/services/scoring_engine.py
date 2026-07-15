from __future__ import annotations

from typing import Sequence

from app.models.certification import Certification
from app.models.department_skill import DepartmentSkills
from app.models.education import Education
from app.schemas.evaluate import ScoreBreakdown

# ---------------------------------------------------------------------------
# Weight constants
# ---------------------------------------------------------------------------
SKILLS_WEIGHT = 0.40
EXPERIENCE_WEIGHT = 0.25
EDUCATION_WEIGHT = 0.15
CERTIFICATIONS_WEIGHT = 0.05
LANGUAGES_WEIGHT = 0.05
PREFERRED_SKILLS_WEIGHT = 0.10


# ---------------------------------------------------------------------------
# Individual scorers – each returns a value in [0, 100]
# ---------------------------------------------------------------------------

def score_skills(
    required_skills: Sequence[DepartmentSkills],
    candidate_skills_lower: set[str],
) -> float:
    if not required_skills:
        return 0.0
    matched = sum(
        1 for s in required_skills
        if s.title and s.title.strip().lower() in candidate_skills_lower
    )
    return (matched / len(required_skills)) * 100.0


def score_experience(
    required_years: int,
    candidate_years: float,
) -> float:
    if required_years <= 0:
        return 100.0
    if candidate_years >= required_years:
        return 100.0
    return min(candidate_years / required_years, 1.0) * 100.0


def score_education(
    educations: Sequence[Education],
    accepted_fields: Sequence[str] | None = None,
    min_degree: str | None = None,
) -> float:
    if not accepted_fields and not min_degree:
        return 0.0

    if not educations:
        return 0.0

    _accepted = {f.strip().casefold() for f in accepted_fields if f and f.strip()}
    _min_degree = min_degree.strip().casefold() if min_degree else ""

    for edu in educations:
        field = (edu.field_of_study or "").strip().casefold()
        degree = (edu.degree or "").strip().casefold()

        if not field and not degree:
            continue

        field_match = not _accepted or field in _accepted
        if not field_match:
            continue

        if _min_degree:
            if degree and _is_higher_or_equal_degree(degree, _min_degree):
                return 100.0
        elif field_match:
            return 100.0

    return 0.0


def _is_higher_or_equal_degree(candidate: str, required: str) -> bool:
    DEGREE_ORDER = [
        "high school", "ged",
        "associate", "associate degree",
        "bachelor", "bachelor's", "bachelor degree", "bac",
        "master", "master's", "master degree",
        "doctorate", "phd", "doctor",
    ]
    try:
        req_idx = next(i for i, d in enumerate(DEGREE_ORDER) if d in required)
    except StopIteration:
        return candidate == required
    try:
        cand_idx = next(i for i, d in enumerate(DEGREE_ORDER) if d in candidate)
    except StopIteration:
        return candidate == required
    return cand_idx >= req_idx


def score_certifications(
    certifications: Sequence[Certification],
    required_certs: Sequence[str] | None = None,
) -> float:
    if not required_certs:
        return 0.0

    if not certifications:
        return 0.0

    candidate_names = {c.name.strip().casefold() for c in certifications if c.name}
    required_lower = {r.strip().casefold() for r in required_certs if r and r.strip()}

    if not required_lower:
        return 0.0

    matched = sum(1 for r in required_lower if r in candidate_names)
    return (matched / len(required_lower)) * 100.0


def score_languages(
    candidate_language_names: Sequence[str],
) -> float:
    count = len([n for n in candidate_language_names if n and n.strip()])
    return min(count / 3.0, 1.0) * 100.0


def score_preferred_skills(
    candidate_skills_lower: set[str],
    preferred_skill_names: Sequence[str] | None = None,
    skills_score: float = 0.0,
) -> float:
    if preferred_skill_names:
        preferred_lower = {p.strip().casefold() for p in preferred_skill_names if p and p.strip()}
        if not preferred_lower:
            return 0.0
        matched = sum(1 for p in preferred_lower if p in candidate_skills_lower)
        return (matched / len(preferred_lower)) * 100.0
    return skills_score


# ---------------------------------------------------------------------------
# Weighted composition
# ---------------------------------------------------------------------------

def compute_compatibility(
    *,
    required_skills: Sequence[DepartmentSkills],
    candidate_skills_lower: set[str],
    required_years: int,
    relevant_years: float,
    educations: Sequence[Education],
    certifications: Sequence[Certification],
    candidate_language_names: Sequence[str],
    accepted_education_fields: Sequence[str] | None = None,
    min_degree: str | None = None,
    required_certifications: Sequence[str] | None = None,
    preferred_skill_names: Sequence[str] | None = None,
) -> ScoreBreakdown:
    s_skills = score_skills(required_skills, candidate_skills_lower)
    s_experience = score_experience(required_years, relevant_years)
    s_education = score_education(educations, accepted_education_fields, min_degree)
    s_certs = score_certifications(certifications, required_certifications)
    s_langs = score_languages(candidate_language_names)
    s_preferred = score_preferred_skills(candidate_skills_lower, preferred_skill_names, skills_score=s_skills)

    total = (
        s_skills * SKILLS_WEIGHT
        + s_experience * EXPERIENCE_WEIGHT
        + s_education * EDUCATION_WEIGHT
        + s_certs * CERTIFICATIONS_WEIGHT
        + s_langs * LANGUAGES_WEIGHT
        + s_preferred * PREFERRED_SKILLS_WEIGHT
    )

    return ScoreBreakdown(
        skills_score=round(s_skills, 2),
        experience_score=round(s_experience, 2),
        education_score=round(s_education, 2),
        certifications_score=round(s_certs, 2),
        languages_score=round(s_langs, 2),
        preferred_skills_score=round(s_preferred, 2),
        total=round(total, 2),
        skills_weight=SKILLS_WEIGHT,
        experience_weight=EXPERIENCE_WEIGHT,
        education_weight=EDUCATION_WEIGHT,
        certifications_weight=CERTIFICATIONS_WEIGHT,
        languages_weight=LANGUAGES_WEIGHT,
        preferred_skills_weight=PREFERRED_SKILLS_WEIGHT,
    )
