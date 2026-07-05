from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.evaluation_result import EvaluationResult


class EvaluationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def save_result(self, result: EvaluationResult) -> EvaluationResult:
        self.db.add(result)
        self.db.commit()
        self.db.refresh(result)
        return result

    def get_by_candidate(self, candidate_id: int) -> list[EvaluationResult]:
        return (
            self.db.query(EvaluationResult)
            .filter(EvaluationResult.candidate_id == candidate_id)
            .order_by(EvaluationResult.created_at.desc())
            .all()
        )
