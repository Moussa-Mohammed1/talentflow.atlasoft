"""create notifications table

Revision ID: a41d9f6c21b0
Revises: f59cfca3c507
Create Date: 2026-06-24 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a41d9f6c21b0"
down_revision: Union[str, Sequence[str], None] = "f59cfca3c507"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


notification_type = postgresql.ENUM(
    "success",
    "warning",
    "error",
    "info",
    name="notification_type_enum",
    create_type=False,
)


def upgrade() -> None:
    notification_type.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recruiter_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", notification_type, nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["recruiter_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_recruiter_id", "notifications", ["recruiter_id"])
    op.create_index(
        "ix_notifications_recruiter_unread_created",
        "notifications",
        ["recruiter_id", "is_read", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_recruiter_unread_created", table_name="notifications")
    op.drop_index("ix_notifications_recruiter_id", table_name="notifications")
    op.drop_table("notifications")
    notification_type.drop(op.get_bind(), checkfirst=True)
