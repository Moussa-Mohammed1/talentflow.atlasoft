from __future__ import annotations

import logging
import threading
from typing import Any

logger = logging.getLogger("talentflow.worker.models")

_LOCK = threading.Lock()
_WARMED_UP = False
_SHARED_ONTOLOGY: Any = None


def get_shared_ontology(preload_embeddings: bool = True):
    """Return a per-worker-process cached SkillOntology (optionally with embeddings warmed)."""
    global _SHARED_ONTOLOGY
    with _LOCK:
        if _SHARED_ONTOLOGY is None:
            from app.services.skill_extraction.ontology import SkillOntology

            _SHARED_ONTOLOGY = SkillOntology()
        if preload_embeddings:
            _SHARED_ONTOLOGY.ensure_embeddings()
        return _SHARED_ONTOLOGY


def reset_model_registry_for_tests() -> None:
    """Reset process-wide model singletons during isolated unit tests."""
    global _WARMED_UP, _SHARED_ONTOLOGY
    with _LOCK:
        _WARMED_UP = False
        _SHARED_ONTOLOGY = None


def warmup_worker_models() -> dict[str, bool]:
    """Load heavyweight NLP/embedding/vision models once per worker process."""
    global _WARMED_UP
    status: dict[str, bool] = {
        "skill_ontology_embeddings": False,
        "face_detector": False,
    }
    if _WARMED_UP:
        return {"skill_ontology_embeddings": True, "face_detector": True}

    try:
        ontology = get_shared_ontology()
        status["skill_ontology_embeddings"] = ontology is not None
    except Exception:
        logger.warning("SkillOntology warmup skipped/failed", exc_info=True)

    try:
        from app.utils.face_detector import FaceDetector

        FaceDetector()
        status["face_detector"] = True
    except Exception:
        logger.warning("FaceDetector warmup skipped/failed", exc_info=True)

    _WARMED_UP = True
    logger.info("Worker model warmup completed: %s", status)
    return status


def is_warmed_up() -> bool:
    return _WARMED_UP
