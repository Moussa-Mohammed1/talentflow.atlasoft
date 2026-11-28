from __future__ import annotations

import hashlib
import logging
import math
import re
import threading
from typing import Iterable

from app.core.config import settings
from app.models.embeddings import EMBEDDING_DIMENSION

logger = logging.getLogger("talentflow.embeddings")

_TOKEN_RE = re.compile(r"[a-z0-9+#.]{2,}")


class DeterministicHashingEmbedder:
    """Offline/test fallback generating L2-normalized token/ngram hash vectors."""

    def __init__(self, dimension: int = EMBEDDING_DIMENSION) -> None:
        self.dimension = dimension
        self.model_name = "deterministic-hashing-384"

    def encode(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            vec = [0.0] * self.dimension
            lowered = (text or "").casefold()
            tokens = _TOKEN_RE.findall(lowered)
            # Include unigrams + bigrams so phrase similarity is preserved
            features = list(tokens) + [f"{tokens[i]}_{tokens[i + 1]}" for i in range(len(tokens) - 1)]
            for feat in features:
                digest = hashlib.blake2b(feat.encode("utf-8"), digest_size=8).digest()
                idx = int.from_bytes(digest[:4], "big") % self.dimension
                sign = 1.0 if (digest[4] & 1) == 0 else -1.0
                vec[idx] += sign

            norm = math.sqrt(sum(v * v for v in vec))
            if norm > 0:
                vec = [round(v / norm, 8) for v in vec]
            vectors.append(vec)
        return vectors


class EmbeddingService:
    """Generates normalized vector embeddings via SentenceTransformers with deterministic fallback."""

    _model_lock = threading.Lock()
    _cached_st_model = None
    _st_load_attempted = False

    def __init__(
        self,
        model_name: str | None = None,
        dimension: int = EMBEDDING_DIMENSION,
        local_files_only: bool | None = None,
        backend=None,
    ) -> None:
        self.model_name = model_name or settings.embedding_model_name
        self.dimension = dimension
        self.local_files_only = (
            settings.embedding_local_files_only if local_files_only is None else local_files_only
        )
        self._injected_backend = backend
        self._fallback = DeterministicHashingEmbedder(dimension=dimension)

    @classmethod
    def reset_cache_for_tests(cls) -> None:
        with cls._model_lock:
            cls._cached_st_model = None
            cls._st_load_attempted = False

    def _get_sentence_transformer(self):
        if self._injected_backend is not None:
            return self._injected_backend

        if EmbeddingService._st_load_attempted:
            return EmbeddingService._cached_st_model

        with EmbeddingService._model_lock:
            if EmbeddingService._st_load_attempted:
                return EmbeddingService._cached_st_model
            EmbeddingService._st_load_attempted = True
            try:
                from sentence_transformers import SentenceTransformer

                EmbeddingService._cached_st_model = SentenceTransformer(
                    self.model_name,
                    local_files_only=self.local_files_only,
                )
            except Exception as exc:
                logger.info(
                    "SentenceTransformer '%s' unavailable locally (%s); using deterministic fallback embedder.",
                    self.model_name,
                    exc,
                )
                EmbeddingService._cached_st_model = None
            return EmbeddingService._cached_st_model

    @property
    def active_model_name(self) -> str:
        model = self._get_sentence_transformer()
        if model is None:
            return self._fallback.model_name
        return getattr(model, "model_name", self.model_name)

    def embed_texts(self, texts: Iterable[str]) -> tuple[list[list[float]], str]:
        batch = [t.strip() for t in texts]
        if not batch:
            return [], self.active_model_name

        model = self._get_sentence_transformer()
        if model is not None:
            raw = model.encode(batch, normalize_embeddings=True)
            vectors = [[float(x) for x in row] for row in raw]
            return vectors, self.active_model_name

        return self._fallback.encode(batch), self._fallback.model_name

    def embed_text(self, text: str) -> tuple[list[float], str]:
        vectors, used_model = self.embed_texts([text])
        return vectors[0], used_model
