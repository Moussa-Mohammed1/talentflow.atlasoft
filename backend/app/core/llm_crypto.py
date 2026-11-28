from __future__ import annotations

import base64
import hashlib
import logging
import os
from typing import Iterable

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger("talentflow.llm.crypto")


class LLMConfigEncryptionError(RuntimeError):
    """Raised when LLM secret encryption/decryption cannot be performed safely."""


def _resolve_fernet_key() -> bytes:
    configured = (
        os.getenv("LLM_CONFIG_ENCRYPTION_KEY")
        or settings.llm_config_encryption_key
        or ""
    ).strip()

    if configured:
        return configured.encode("utf-8")

    env = (os.getenv("ENVIRONMENT") or settings.environment or "development").strip().lower()
    if env in {"staging", "production"}:
        raise LLMConfigEncryptionError(
            "LLM_CONFIG_ENCRYPTION_KEY must be configured in staging/production environments."
        )

    fallback_secret = (os.getenv("SECRET_KEY") or settings.secret_key or "").strip()
    if not fallback_secret:
        raise LLMConfigEncryptionError(
            "LLM_CONFIG_ENCRYPTION_KEY (or SECRET_KEY in dev/test) is required to encrypt API keys."
        )

    logger.warning(
        "LLM_CONFIG_ENCRYPTION_KEY is unset; deriving a dev/test Fernet key from SECRET_KEY."
    )
    digest = hashlib.sha256(f"talentflow-llm-config:{fallback_secret}".encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _get_fernet() -> Fernet:
    key_bytes = _resolve_fernet_key()
    try:
        return Fernet(key_bytes)
    except Exception as exc:
        raise LLMConfigEncryptionError(
            "LLM_CONFIG_ENCRYPTION_KEY is not a valid Fernet key."
        ) from exc


def encrypt_api_key(plaintext: str) -> str:
    """Encrypt an API key using Fernet symmetric encryption."""
    cleaned = (plaintext or "").strip()
    if not cleaned:
        raise ValueError("API key cannot be empty.")
    token = _get_fernet().encrypt(cleaned.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_api_key(ciphertext: str) -> str:
    """Decrypt a stored Fernet-encrypted API key."""
    if not ciphertext:
        raise ValueError("Encrypted API key is empty.")
    try:
        plain = _get_fernet().decrypt(ciphertext.encode("utf-8"))
        return plain.decode("utf-8")
    except InvalidToken as exc:
        raise LLMConfigEncryptionError(
            "Failed to decrypt stored LLM API key with the configured encryption key."
        ) from exc


def mask_api_key(plaintext: str | None) -> str | None:
    """Return a non-reversible masked hint like '••••1234' or None if unset."""
    cleaned = (plaintext or "").strip()
    if not cleaned:
        return None
    if len(cleaned) <= 4:
        return "••••"
    return f"••••{cleaned[-4:]}"


def redact_secrets(text: str, secrets_to_hide: Iterable[str | None] = ()) -> str:
    """Scrub known secret values from strings before logging or persisting messages."""
    if not text:
        return text
    redacted = text
    for secret in secrets_to_hide:
        cleaned = (secret or "").strip()
        if len(cleaned) >= 4:
            redacted = redacted.replace(cleaned, "[REDACTED]")
    return redacted
