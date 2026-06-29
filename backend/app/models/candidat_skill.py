from sqlalchemy import Column, Integer, ForeignKey
from app.core.database import Base

class CandidatSkills(Base):
    __tablename__ = 'candidat_skills'

    id = Column(Integer, primary_key=True, index=True)
    
    candidat_id = Column(Integer, ForeignKey("candidats.id", ondelete="CASCADE"), nullable=False)

    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)