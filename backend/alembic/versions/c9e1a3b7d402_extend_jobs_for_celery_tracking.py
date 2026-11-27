"""extend jobs table for celery tracking, progress, retries, and results

Revision ID: c9e1a3b7d402
Revises: a27df4d3d5fc
Create Date: 2026-11-27 23:40:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9e1a3b7d402"
down_revision: Union[str, Sequence[str], None] = "a27df4d3d5fc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE job_type_enum ADD VALUE IF NOT EXISTS 'job_offer_generation'")
            op.execute("ALTER TYPE job_type_enum ADD VALUE IF NOT EXISTS 'evaluation_validation'")

    op.add_column("jobs", sa.Column("celery_task_id", sa.String(length=255), nullable=True))
    op.add_column(
        "jobs",
        sa.Column("queue_name", sa.String(length=64), nullable=False, server_default="default"),
    )
    op.add_column(
        "jobs",
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("jobs", sa.Column("current_step", sa.String(length=128), nullable=True))
    op.add_column(
        "jobs",
        sa.Column("retries", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "jobs",
        sa.Column("max_retries", sa.Integer(), nullable=False, server_default="3"),
    )
    op.add_column("jobs", sa.Column("error_details", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("result_payload", sa.JSON(), nullable=True))
    op.add_column(
        "jobs",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_jobs_celery_task_id", "jobs", ["celery_task_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_jobs_celery_task_id", table_name="jobs")
    op.drop_column("jobs", "updated_at")
    op.drop_column("jobs", "result_payload")
    op.drop_column("jobs", "error_details")
    op.drop_column("jobs", "max_retries")
    op.drop_column("jobs", "retries")
    op.drop_column("jobs", "current_step")
    op.drop_column("jobs", "progress")
    op.drop_column("jobs", "queue_name")
    op.drop_column("jobs", "celery_task_id")
