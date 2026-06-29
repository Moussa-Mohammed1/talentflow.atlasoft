from sqlalchemy import Column, Integer, String, ForeignKey
from app.core.database import Base

class CandidatLanguages(Base):
    __tablename__ = "candidat_languages"

    candidat_id = Column(Integer, ForeignKey("candidats.id", ondelete="CASCADE"), primary_key=True)

    language_id = Column(Integer, ForeignKey("languages.id"), primary_key=True)
    
    proficiency = Column(String, nullable=True)