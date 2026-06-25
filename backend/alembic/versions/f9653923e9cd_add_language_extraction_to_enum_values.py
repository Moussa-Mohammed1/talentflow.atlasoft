"""add language_extraction to job_type_enum

Revision ID: f9653923e9cd
Revises: bb219e7cbfea
Create Date: 2026-06-25 23:15:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "f9653923e9cd"
down_revision: Union[str, Sequence[str], None] = "bb219e7cbfea"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE job_type_enum ADD VALUE IF NOT EXISTS 'language_extraction'")


def downgrade() -> None:
    op.execute("ALTER TYPE job_type_enum RENAME TO job_type_enum_old")
    op.execute("CREATE TYPE job_type_enum AS ENUM('identity_extraction', 'resume_screening', 'bulk_data_export', 'candidate_matching', 'skill_extraction', 'experience_extraction')")
    op.execute("ALTER TABLE jobs ALTER COLUMN type TYPE job_type_enum USING type::text::job_type_enum")
    op.execute("DROP TYPE job_type_enum_old")
