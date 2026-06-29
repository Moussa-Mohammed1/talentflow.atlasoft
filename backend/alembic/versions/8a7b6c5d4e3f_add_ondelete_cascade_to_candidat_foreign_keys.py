"""add ondelete cascade to candidat foreign keys

Revision ID: 8a7b6c5d4e3f
Revises: f9653923e9cd
Create Date: 2026-06-26 00:45:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "8a7b6c5d4e3f"
down_revision: Union[str, Sequence[str], None] = "f9653923e9cd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


FK_CONSTRAINTS = [
    ("candidat_skills", "candidat_skills_candidat_id_fkey", "candidat_id"),
    ("candidat_languages", "candidat_languages_candidat_id_fkey", "candidat_id"),
    ("certifications", "certifications_candidat_id_fkey", "candidat_id"),
    ("educations", "educations_candidat_id_fkey", "candidat_id"),
]


def upgrade() -> None:
    for table, constraint, column in FK_CONSTRAINTS:
        op.execute(
            f"ALTER TABLE {table} DROP CONSTRAINT {constraint}"
        )
        op.execute(
            f"ALTER TABLE {table} ADD CONSTRAINT {constraint} "
            f"FOREIGN KEY ({column}) REFERENCES candidats(id) ON DELETE CASCADE"
        )


def downgrade() -> None:
    for table, constraint, column in FK_CONSTRAINTS:
        op.execute(
            f"ALTER TABLE {table} DROP CONSTRAINT {constraint}"
        )
        op.execute(
            f"ALTER TABLE {table} ADD CONSTRAINT {constraint} "
            f"FOREIGN KEY ({column}) REFERENCES candidats(id)"
        )
