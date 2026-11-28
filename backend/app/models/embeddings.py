from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Engine,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    event,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import TypeDecorator, UserDefinedType

from app.core.database import Base

EMBEDDING_DIMENSION = 384

try:
    from pgvector.sqlalchemy import Vector as _PgVectorNative
except ImportError:  # pragma: no cover - fallback when pgvector python package is absent
    _PgVectorNative = None

# Optimistic default so PostgreSQL SQL compilation tests work offline without a live Postgres server.
# Automatically flipped to False on PostgreSQL Engine first_connect if pgvector is not installed.
_POSTGRES_HAS_PGVECTOR = True


@event.listens_for(Engine, "first_connect")
def _detect_postgres_pgvector(dbapi_connection, connection_record) -> None:
    global _POSTGRES_HAS_PGVECTOR
    module_name = type(dbapi_connection).__module__
    if "psycopg" not in module_name and "pg8000" not in module_name:
        return
    try:
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")
            row = cursor.fetchone()
            _POSTGRES_HAS_PGVECTOR = row is not None
        finally:
            cursor.close()
    except Exception:
        _POSTGRES_HAS_PGVECTOR = False


class _FallbackPostgresVector(UserDefinedType):
    """Minimal PostgreSQL vector(dim) SQL type used if pgvector package is not installed."""

    cache_ok = True

    def __init__(self, dim: int = EMBEDDING_DIMENSION) -> None:
        self.dim = dim

    def get_col_spec(self, **kw: Any) -> str:
        return f"vector({self.dim})"


class PgVectorType(TypeDecorator):
    """Dialect-aware embedding column: pgvector(dim) when available on PostgreSQL, JSON otherwise."""

    impl = JSON
    cache_ok = True

    def __init__(self, dim: int = EMBEDDING_DIMENSION) -> None:
        super().__init__()
        self.dim = dim

    class comparator_factory(TypeDecorator.Comparator):
        def cosine_distance(self, other: Any):
            return self.op("<=>")(other)

        def l2_distance(self, other: Any):
            return self.op("<->")(other)

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and _POSTGRES_HAS_PGVECTOR:
            if _PgVectorNative is not None:
                return dialect.type_descriptor(_PgVectorNative(self.dim))
            return dialect.type_descriptor(_FallbackPostgresVector(self.dim))
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        vec = [float(x) for x in value]
        if dialect.name == "postgresql" and _POSTGRES_HAS_PGVECTOR and _PgVectorNative is None:
            return "[" + ",".join(f"{x:.8f}" for x in vec) + "]"
        return vec

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip().strip("[]")
            if not stripped:
                return []
            return [float(part) for part in stripped.split(",")]
        return [float(x) for x in value]


class CandidateEmbedding(Base):
    """Vector embedding for a candidate's full profile or semantic chunk."""

    __tablename__ = "candidate_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "chunk_type",
            "chunk_index",
            name="uq_candidate_embedding_chunk",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(
        Integer,
        ForeignKey("candidats.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_type = Column(String(64), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False, default=0)
    chunk_text = Column(Text, nullable=False)
    model_name = Column(String(255), nullable=False)
    embedding = Column(PgVectorType(EMBEDDING_DIMENSION), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class JobOfferEmbedding(Base):
    """Vector embedding for a job offer description and requirements."""

    __tablename__ = "job_offer_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    job_offer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("job_offers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    source_text = Column(Text, nullable=False)
    model_name = Column(String(255), nullable=False)
    embedding = Column(PgVectorType(EMBEDDING_DIMENSION), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
