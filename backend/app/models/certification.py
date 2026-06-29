from sqlalchemy import Column, Integer, DateTime, String, Text, ForeignKey
from datetime import datetime
from app.core.database import Base

class Certification(Base):
    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True)

    candidat_id = Column(Integer, ForeignKey("candidats.id", ondelete="CASCADE"))

    name = Column(String, nullable=True)

    organization = Column(String, nullable=True)

    issue_date = Column(DateTime, nullable=True)

    expiration_date = Column(DateTime, nullable=True)

    credential_id = Column(String, nullable=True)

    credential_url = Column(String, nullable=True)

    description = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
