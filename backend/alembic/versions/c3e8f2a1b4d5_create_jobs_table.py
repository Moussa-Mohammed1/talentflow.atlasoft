"""create jobs table

Revision ID: c3e8f2a1b4d5
Revises: a41d9f6c21b0
Create Date: 2026-06-25 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c3e8f2a1b4d5"
down_revision: Union[str, Sequence[str], None] = "a41d9f6c21b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


job_type = postgresql.ENUM(
    "identity_extraction",
    "resume_screening",
    "bulk_data_export",
    "candidate_matching",
    "skill_extraction",
    "language_extraction",
    "experience_extraction",
    name="job_type_enum",
    create_type=False,
)

job_status = postgresql.ENUM(
    "pending",
    "running",
    "completed",
    "failed",
    name="job_status_enum",
    create_type=False,
)


def upgrade() -> None:
    job_type.create(op.get_bind(), checkfirst=True)
    job_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recruiter_id", sa.Integer(), nullable=False),
        sa.Column("type", job_type, nullable=False),
        sa.Column("target", sa.String(length=255), nullable=False),
        sa.Column("status", job_status, nullable=False, server_default="pending"),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["recruiter_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_jobs_recruiter_id", "jobs", ["recruiter_id"])
    op.create_index(
        "ix_jobs_recruiter_status_created",
        "jobs",
        ["recruiter_id", "status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_jobs_recruiter_status_created", table_name="jobs")
    op.drop_index("ix_jobs_recruiter_id", table_name="jobs")
    op.drop_table("jobs")
    job_status.drop(op.get_bind(), checkfirst=True)
    job_type.drop(op.get_bind(), checkfirst=True)