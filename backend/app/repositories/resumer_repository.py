from sqlalchemy.orm import Session
from app.models.resume import Resume
from app.models.candidat import Candidat

class ResumeRepository:
    @staticmethod
    def get_all(db: Session):
        return db.query(Resume, Candidat).outerjoin(
            Candidat, Candidat.resume_id == Resume.id
        )
    @staticmethod
    def get_all_by_recruiter(db: Session, recruiter_id: int):

        return db.query(Resume, Candidat).outerjoin(
            Candidat, Candidat.resume_id == Resume.id
        ).filter(Resume.recruiter_id == recruiter_id).all()

    @staticmethod
    def get_by_id(db: Session, resume_id: int, recruiter_id: int):
        return db.query(Resume).filter(
            Resume.id == resume_id, 
            Resume.recruiter_id == recruiter_id
        ).first()

    @staticmethod
    def delete(db: Session, resume: Resume):
        db.delete(resume)
        db.commit()
     