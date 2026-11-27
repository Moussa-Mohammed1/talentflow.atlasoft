from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.security import get_current_user
from app.models.user import User
from app.services.storage import get_storage_backend, normalize_storage_key

router = APIRouter(prefix="/files", tags=["Files"])

_ALLOWED_PREFIXES = ("avatars/", "candidate_photos/", "resumes/")


@router.get("/{file_key:path}", status_code=status.HTTP_200_OK)
def get_authenticated_file(
    file_key: str,
    current_user: User = Depends(get_current_user),
) -> Response:
    try:
        normalized = normalize_storage_key(file_key)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Clé de fichier invalide",
        ) from exc

    if not normalized.startswith(_ALLOWED_PREFIXES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à cette ressource",
        )

    storage = get_storage_backend()
    try:
        content = storage.read_bytes(normalized)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier introuvable",
        ) from exc

    media_type, _ = mimetypes.guess_type(normalized)
    headers = {
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": f'inline; filename="{Path(normalized).name}"',
    }
    return Response(
        content=content,
        media_type=media_type or "application/octet-stream",
        headers=headers,
    )
