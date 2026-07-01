"""add education_extraction to job_type_enum

Revision ID: fb77119dd8ae
Revises: e1d4a6b7c8f9
Create Date: 2026-07-01 11:24:32.475627

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb77119dd8ae'
down_revision: Union[str, Sequence[str], None] = 'e1d4a6b7c8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE job_type_enum ADD VALUE IF NOT EXISTS 'education_extraction'")


def downgrade() -> None:
    op.execute("ALTER TYPE job_type_enum RENAME TO job_type_enum_old")
    op.execute(
        "CREATE TYPE job_type_enum AS ENUM("
        "'identity_extraction', 'resume_screening', 'bulk_data_export', "
        "'candidate_matching', 'skill_extraction', 'experience_extraction', "
        "'language_extraction'"
        ")"
    )
    op.execute("ALTER TABLE jobs ALTER COLUMN type TYPE job_type_enum USING type::text::job_type_enum")
    op.execute("DROP TYPE job_type_enum_old")
