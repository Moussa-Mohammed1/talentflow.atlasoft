"""add reset_code and reset_code_expires_at to users

Revision ID: a7b8c9d0e1f2
Revises: e5f6a7b8c9d0
Create Date: 2026-07-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("reset_code", sa.String(), nullable=True))
    op.add_column("users", sa.Column("reset_code_expires_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "reset_code_expires_at")
    op.drop_column("users", "reset_code")
