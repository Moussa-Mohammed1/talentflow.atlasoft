from sqlalchemy import Column, Integer, DateTime, String, Text, ForeignKey
from datetime import datetime
from app.core.database import Base

class Education(Base):
    __tablename__ = "educations"

    id = Column(Integer, primary_key=True, index=True)

    candidat_id = Column(Integer, ForeignKey("candidats.id", ondelete="CASCADE"))
    
    institution = Column(String, nullable=True)

    degree = Column(String, nullable=True)

    field_of_study = Column(String, nullable=True)

    start_date = Column(DateTime, nullable=True)

    end_date = Column(DateTime, nullable=True)

    description = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
