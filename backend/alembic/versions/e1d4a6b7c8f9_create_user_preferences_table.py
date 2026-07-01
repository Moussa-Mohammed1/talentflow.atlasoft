"""create user_preferences table

Revision ID: e1d4a6b7c8f9
Revises: f9653923e9cd
Create Date: 2026-06-30 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1d4a6b7c8f9"
down_revision: Union[str, Sequence[str], None] = "8a7b6c5d4e3f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("email_new_candidate", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("email_invitation_accepted", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("email_system_updates", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("theme", sa.String(), server_default="system", nullable=False),
        sa.Column("language", sa.String(), server_default="fr", nullable=False),
        sa.Column("items_per_page", sa.Integer(), server_default="20", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_preferences_user_id", "user_preferences", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_user_preferences_user_id", table_name="user_preferences")
    op.drop_table("user_preferences")
