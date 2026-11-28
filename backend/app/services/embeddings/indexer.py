from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.embeddings import CandidateEmbedding, JobOfferEmbedding
from app.models.job_offers import JobOffers
from app.services.embeddings.chunker import CandidateChunkBuilder, JobOfferTextBuilder
from app.services.embeddings.embedder import EmbeddingService


class EmbeddingIndexService:
    """Generates and persists pgvector embeddings for candidate profiles/chunks and job offers."""

    def __init__(self, embedder: EmbeddingService | None = None) -> None:
        self.embedder = embedder or EmbeddingService()

    def index_candidate(self, db: Session, candidate_id: int) -> list[CandidateEmbedding]:
        chunks = CandidateChunkBuilder.build_chunks_from_db(db, candidate_id)
        db.query(CandidateEmbedding).filter(
            CandidateEmbedding.candidate_id == candidate_id
        ).delete(synchronize_session=False)

        if not chunks:
            db.commit()
            return []

        vectors, model_name = self.embedder.embed_texts([c.text for c in chunks])
        records: list[CandidateEmbedding] = []
        for chunk, vector in zip(chunks, vectors):
            record = CandidateEmbedding(
                candidate_id=candidate_id,
                chunk_type=chunk.chunk_type,
                chunk_index=chunk.chunk_index,
                chunk_text=chunk.text,
                model_name=model_name,
                embedding=vector,
            )
            db.add(record)
            records.append(record)

        db.commit()
        for record in records:
            db.refresh(record)
        return records

    def index_job_offer(self, db: Session, job_offer_id: UUID) -> JobOfferEmbedding | None:
        offer = db.query(JobOffers).filter(JobOffers.id == job_offer_id).first()
        if offer is None:
            return None

        source_text = JobOfferTextBuilder.build_text(db, offer)
        vector, model_name = self.embedder.embed_text(source_text)

        existing = (
            db.query(JobOfferEmbedding)
            .filter(JobOfferEmbedding.job_offer_id == job_offer_id)
            .first()
        )
        if existing is None:
            existing = JobOfferEmbedding(
                job_offer_id=job_offer_id,
                source_text=source_text,
                model_name=model_name,
                embedding=vector,
            )
            db.add(existing)
        else:
            existing.source_text = source_text
            existing.model_name = model_name
            existing.embedding = vector

        db.commit()
        db.refresh(existing)
        return existing
