from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.schemas.identity_extraction import ResumeIdentityRead


def update_candidat_from_identity(
    db: Session,
    candidat: Candidat,
    identity: ResumeIdentityRead,
) -> Candidat:
    fullname = identity.name.full_name.strip()
    email = (identity.email.value or "").strip()
    phone = (identity.phone.value or "").strip()

    if fullname:
        candidat.fullname = fullname
    if email:
        candidat.email = email
    if phone:
        candidat.phone = phone

    db.commit()
    db.refresh(candidat)
    return candidat
