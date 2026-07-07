"""create recruitment tables

Revision ID: da1998bef981
Revises: fa74884689e6
Create Date: 2026-07-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "da1998bef981"
down_revision: Union[str, None] = "fa74884689e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recruitments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidats.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("job_offer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_offers.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("compatibility_score", sa.Numeric(5, 2), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "interview_invitation_sent", "interview_confirmed",
                "interview_completed", "offer_sent", "offer_accepted",
                "offer_rejected", "candidate_declined", "hired", "cancelled",
                name="recruitment_status_enum",
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "priority",
            sa.Enum("low", "medium", "high", name="recruitment_priority_enum"),
            nullable=False,
            server_default="medium",
        ),
        sa.Column("assigned_recruiter_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "interviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("recruitment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recruitments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column(
            "interview_type",
            sa.Enum("online", "phone", "onsite", name="interview_type_enum"),
            nullable=False,
            server_default="online",
        ),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("meeting_link", sa.String(), nullable=True),
        sa.Column("interviewer_name", sa.String(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("scheduled", "completed", "cancelled", "rescheduled", name="interview_status_enum"),
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "recruitment_emails",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("recruitment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recruitments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column(
            "email_type",
            sa.Enum("interview_invitation", "reminder", "offer", "rejection", "custom", name="email_type_enum"),
            nullable=False,
        ),
        sa.Column("sender_email", sa.String(), nullable=False),
        sa.Column("recipient_email", sa.String(), nullable=False),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("draft", "queued", "sent", "failed", name="email_status_enum"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("provider_message_id", sa.String(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("recruitment_emails")
    op.drop_table("interviews")
    op.drop_table("recruitments")

    op.execute("DROP TYPE IF EXISTS recruitment_status_enum")
    op.execute("DROP TYPE IF EXISTS recruitment_priority_enum")
    op.execute("DROP TYPE IF EXISTS interview_type_enum")
    op.execute("DROP TYPE IF EXISTS interview_status_enum")
    op.execute("DROP TYPE IF EXISTS email_type_enum")
    op.execute("DROP TYPE IF EXISTS email_status_enum")
