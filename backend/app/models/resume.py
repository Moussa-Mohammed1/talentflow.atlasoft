from datetime import datetime
from sqlalchemy import String, Column, Integer, DateTime, ForeignKey
from app.core.database import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)

    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    path = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)