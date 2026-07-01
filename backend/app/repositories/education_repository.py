from sqlalchemy.orm import Session

from app.models.education import Education
from app.schemas.education_extraction import EducationItemRead


class EducationRepository:
    @staticmethod
    def replace_for_candidate(
        db: Session,
        candidat_id: int,
        educations: list[EducationItemRead],
    ) -> list[Education]:
        db.query(Education).filter(Education.candidat_id == candidat_id).delete(
            synchronize_session=False
        )
        records = [
            Education(
                candidat_id=candidat_id,
                institution=item.institution,
                degree=item.degree,
                field_of_study=item.field_of_study,
                start_date=item.start_date,
                end_date=item.end_date,
                description=item.description,
            )
            for item in educations
        ]
        db.add_all(records)
        db.commit()
        for record in records:
            db.refresh(record)
        return records
