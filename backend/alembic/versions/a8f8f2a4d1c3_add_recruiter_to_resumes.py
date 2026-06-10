"""add recruiter to resumes

Revision ID: a8f8f2a4d1c3
Revises: 4ade0f505567
Create Date: 2026-06-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a8f8f2a4d1c3"
down_revision: Union[str, Sequence[str], None] = "4ade0f505567"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("resumes", sa.Column("recruiter_id", sa.Integer(), nullable=False))
    op.create_foreign_key(
        "fk_resumes_recruiter_id_users",
        "resumes",
        "users",
        ["recruiter_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_resumes_recruiter_id_users", "resumes", type_="foreignkey")
    op.drop_column("resumes", "recruiter_id")
