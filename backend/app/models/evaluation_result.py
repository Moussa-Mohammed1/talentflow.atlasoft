from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON

from app.core.database import Base


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(
        Integer,
        ForeignKey("candidats.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id = Column(
        Integer,
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    compatibility = Column(Float, nullable=False)
    requirements = Column(JSON, nullable=False, default=list)
    missing_experiences = Column(JSON, nullable=False, default=list)
    candidate_extra_experiences = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
