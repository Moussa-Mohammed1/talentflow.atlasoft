from sqlalchemy.orm import Session

from app.models.certification import Certification
from app.schemas.certification_extraction import CertificationItemRead


class CertificationRepository:
    @staticmethod
    def replace_for_candidate(
        db: Session,
        candidat_id: int,
        certifications: list[CertificationItemRead],
    ) -> list[Certification]:
        db.query(Certification).filter(Certification.candidat_id == candidat_id).delete(
            synchronize_session=False
        )
        records = [
            Certification(
                candidat_id=candidat_id,
                name=item.name,
                organization=item.organization,
                issue_date=item.issue_date,
                expiration_date=item.expiration_date,
                credential_id=item.credential_id,
                credential_url=item.credential_url,
                description=item.description,
            )
            for item in certifications
        ]
        db.add_all(records)
        db.commit()
        for record in records:
            db.refresh(record)
        return records
