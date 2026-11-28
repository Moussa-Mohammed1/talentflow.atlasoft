"""enable pgvector extension and create candidate and job_offer embedding tables

Revision ID: e2a3b4c5d6f7
Revises: d1f2a3b4c5e6
Create Date: 2026-11-28 11:46:00.000000
"""

import logging
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from app.models.embeddings import EMBEDDING_DIMENSION, PgVectorType

logger = logging.getLogger("alembic.runtime.migration")

revision: str = "e2a3b4c5d6f7"
down_revision: Union[str, Sequence[str], None] = "d1f2a3b4c5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _pgvector_available(bind) -> bool:
    if bind.dialect.name != "postgresql":
        return False
    row = bind.execute(
        sa.text("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")
    ).first()
    return row is not None


def upgrade() -> None:
    bind = op.get_bind()
    use_pgvector = _pgvector_available(bind)

    if use_pgvector:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        embedding_col_type = PgVectorType(EMBEDDING_DIMENSION)
    else:
        if bind.dialect.name == "postgresql":
            logger.warning(
                "PostgreSQL 'vector' extension is not installed on this server; "
                "creating embedding columns as JSON fallback (HNSW indexes skipped)."
            )
        embedding_col_type = sa.JSON()

    op.create_table(
        "candidate_embeddings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("chunk_type", sa.String(length=64), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("model_name", sa.String(length=255), nullable=False),
        sa.Column("embedding", embedding_col_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidats.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "chunk_type", "chunk_index", name="uq_candidate_embedding_chunk"),
    )
    op.create_index("ix_candidate_embeddings_id", "candidate_embeddings", ["id"], unique=False)
    op.create_index("ix_candidate_embeddings_candidate_id", "candidate_embeddings", ["candidate_id"], unique=False)
    op.create_index("ix_candidate_embeddings_chunk_type", "candidate_embeddings", ["chunk_type"], unique=False)

    op.create_table(
        "job_offer_embeddings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_offer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("model_name", sa.String(length=255), nullable=False),
        sa.Column("embedding", embedding_col_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["job_offer_id"], ["job_offers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_offer_id"),
    )
    op.create_index("ix_job_offer_embeddings_id", "job_offer_embeddings", ["id"], unique=False)
    op.create_index("ix_job_offer_embeddings_job_offer_id", "job_offer_embeddings", ["job_offer_id"], unique=True)

    if use_pgvector:
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_candidate_embeddings_vector_hnsw "
            "ON candidate_embeddings USING hnsw (embedding vector_cosine_ops)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_job_offer_embeddings_vector_hnsw "
            "ON job_offer_embeddings USING hnsw (embedding vector_cosine_ops)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_job_offer_embeddings_vector_hnsw")
        op.execute("DROP INDEX IF EXISTS ix_candidate_embeddings_vector_hnsw")

    op.drop_index("ix_job_offer_embeddings_job_offer_id", table_name="job_offer_embeddings")
    op.drop_index("ix_job_offer_embeddings_id", table_name="job_offer_embeddings")
    op.drop_table("job_offer_embeddings")

    op.drop_index("ix_candidate_embeddings_chunk_type", table_name="candidate_embeddings")
    op.drop_index("ix_candidate_embeddings_candidate_id", table_name="candidate_embeddings")
    op.drop_index("ix_candidate_embeddings_id", table_name="candidate_embeddings")
    op.drop_table("candidate_embeddings")
