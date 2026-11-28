"""add structured profile fields to candidats and job_offers

Revision ID: d1f2a3b4c5e6
Revises: c9e1a3b7d402
Create Date: 2026-11-28 11:45:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1f2a3b4c5e6"
down_revision: Union[str, Sequence[str], None] = "c9e1a3b7d402"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("candidats", sa.Column("current_role", sa.String(length=255), nullable=True))
    op.add_column("candidats", sa.Column("location", sa.String(length=255), nullable=True))
    op.add_column(
        "candidats",
        sa.Column("total_experience_years", sa.Float(), nullable=True, server_default="0"),
    )
    op.add_column("candidats", sa.Column("summary", sa.Text(), nullable=True))
    op.create_index("ix_candidats_current_role", "candidats", ["current_role"], unique=False)
    op.create_index("ix_candidats_location", "candidats", ["location"], unique=False)

    op.add_column("job_offers", sa.Column("location", sa.String(length=255), nullable=True))
    op.add_column("job_offers", sa.Column("required_experience_years", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("job_offers", "required_experience_years")
    op.drop_column("job_offers", "location")

    op.drop_index("ix_candidats_location", table_name="candidats")
    op.drop_index("ix_candidats_current_role", table_name="candidats")
    op.drop_column("candidats", "summary")
    op.drop_column("candidats", "total_experience_years")
    op.drop_column("candidats", "location")
    op.drop_column("candidats", "current_role")
