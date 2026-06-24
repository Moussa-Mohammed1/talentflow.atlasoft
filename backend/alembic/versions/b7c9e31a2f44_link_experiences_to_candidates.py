"""link experiences to candidates

Revision ID: b7c9e31a2f44
Revises: 62a28961b212
Create Date: 2026-06-23 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c9e31a2f44"
down_revision: Union[str, Sequence[str], None] = "62a28961b212"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("experiences", sa.Column("candidat_id", sa.Integer(), nullable=True))
    op.add_column(
        "experiences",
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_experiences_candidat_id", "experiences", ["candidat_id"], unique=False)
    op.create_foreign_key(
        "fk_experiences_candidat_id_candidats",
        "experiences",
        "candidats",
        ["candidat_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_experiences_candidat_id_candidats", "experiences", type_="foreignkey")
    op.drop_index("ix_experiences_candidat_id", table_name="experiences")
    op.drop_column("experiences", "created_at")
    op.drop_column("experiences", "candidat_id")
