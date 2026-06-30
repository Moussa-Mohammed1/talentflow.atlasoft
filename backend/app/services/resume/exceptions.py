from __future__ import annotations


class ResumeError(Exception):
    """Base exception for resume domain errors."""


class ResumeNotFoundError(ResumeError):
    """Resume not found for the given recruiter."""


class CandidateNotFoundError(ResumeError):
    """No candidat associated with this resume."""


class DuplicateCandidateError(ResumeError):
    """Duplicate candidate detected."""
