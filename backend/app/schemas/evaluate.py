from pydantic import BaseModel


class EvaluateRequest(BaseModel):
    candidate_id: int


class RequirementScore(BaseModel):
    experience: str
    required_years: int
    candidate_years: float
    score: float
    matched: bool


class DepartmentEvaluation(BaseModel):
    department_id: int
    department_name: str
    compatibility: float
    requirements: list[RequirementScore]
    missing_experiences: list[str]
    candidate_extra_experiences: list[str]


class EvaluateResponse(BaseModel):
    candidate: dict
    evaluations: list[DepartmentEvaluation]


class EvaluatedCandidateCard(BaseModel):
    candidate_id: int
    resume_id: int
    fullname: str
    photo: str | None = None
    preview_url: str
    skills_count: int
    total_experience_years: float
    languages_count: int
    last_evaluation_date: str
