from sqlalchemy.orm import Session

from app.models.experience import Experience
from app.schemas.experience_extraction import ExperienceItemRead


class ExperienceRepository:
    @staticmethod
    def replace_for_candidate(
        db: Session,
        candidat_id: int,
        experiences: list[ExperienceItemRead],
    ) -> list[Experience]:
        db.query(Experience).filter(Experience.candidat_id == candidat_id).delete(
            synchronize_session=False
        )
        records = [
            Experience(
                candidat_id=candidat_id,
                title=item.title,
                description=item.description,
                start_date=item.start_date,
                end_date=item.end_date,
            )
            for item in experiences
        ]
        db.add_all(records)
        db.commit()
        for record in records:
            db.refresh(record)
        return records
