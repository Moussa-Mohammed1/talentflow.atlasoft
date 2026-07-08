"""add ondelete cascade to user foreign keys

Revision ID: a0b1c2d3e4f5
Revises: c7d8e9f0a1b2
Create Date: 2026-07-08 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "a0b1c2d3e4f5"
down_revision: Union[str, None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("fk_resumes_recruiter_id_users", "resumes", type_="foreignkey")
    op.create_foreign_key(
        "fk_resumes_recruiter_id_users",
        "resumes", "users",
        ["recruiter_id"], ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("invitations_invited_by_fkey", "invitations", type_="foreignkey")
    op.create_foreign_key(
        "invitations_invited_by_fkey",
        "invitations", "users",
        ["invited_by"], ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("fk_candidats_talent_recruiter", "candidats", type_="foreignkey")
    op.create_foreign_key(
        "fk_candidats_talent_recruiter",
        "candidats", "users",
        ["talent_recruiter_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_resumes_recruiter_id_users", "resumes", type_="foreignkey")
    op.create_foreign_key(
        "fk_resumes_recruiter_id_users",
        "resumes", "users",
        ["recruiter_id"], ["id"],
    )

    op.drop_constraint("invitations_invited_by_fkey", "invitations", type_="foreignkey")
    op.create_foreign_key(
        "invitations_invited_by_fkey",
        "invitations", "users",
        ["invited_by"], ["id"],
    )

    op.drop_constraint("fk_candidats_talent_recruiter", "candidats", type_="foreignkey")
    op.create_foreign_key(
        "fk_candidats_talent_recruiter",
        "candidats", "users",
        ["talent_recruiter_id"], ["id"],
    )
