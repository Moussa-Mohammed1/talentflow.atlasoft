from sqlalchemy import Boolean, Integer, DateTime, String, Column, ForeignKey
from app.core.database import Base
from datetime import datetime

class Candidat(Base):
    __tablename__ = "candidats"
    
    id = Column(Integer, primary_key=True, index=True)

    fullname = Column(String, nullable=False, index=True)

    email = Column(String, nullable=False, index=True)

    phone = Column(String, nullable=False, index=True)

    photo = Column(String, nullable=True)

    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    is_talent = Column(Boolean, default=False, nullable=False)
    