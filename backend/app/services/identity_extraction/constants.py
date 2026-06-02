from __future__ import annotations

import re


NAME_BLACKLIST = {
    "developer",
    "Développeur",
    "engineer",
    "student",
    "intern",
    "experience",
    "summary",
    "profile",
    "contact",
    "formation",
    "education",
    "skills",
    "competences",
    "compétences",
    "responsible",
    "full stack developer",
    "software engineer",
    "computer science student",
}

NORMALIZED_NAME_BLACKLIST = {
    "developer",
    "developpeur",
    "engineer",
    "student",
    "intern",
    "experience",
    "summary",
    "profile",
    "contact",
    "formation",
    "education",
    "skills",
    "competences",
    "responsible",
    "full stack developer",
    "full stack",
    "software engineer",
    "computer science student",
}

LOCATION_HINTS = {
    "rabat",
    "casablanca",
    "marrakech",
    "fes",
    "fès",
    "tanger",
    "agadir",
    "sale",
    "salé",
    "kenitra",
    "kénitra",
    "meknes",
    "meknès",
    "paris",
    "lyon",
    "london",
    "montreal",
    "montréal",
    "brussels",
    "casablanca, morocco",
    "maroc",
    "morocco",
}

CONTACT_HINTS = {
    "email",
    "e-mail",
    "mail",
    "phone",
    "tel",
    "tél",
    "telephone",
    "telephone",
    "contact",
    "coordonnees",
    "coordonnées",
    "linkedin",
    "github",
}

EMAIL_PATTERN = re.compile(
    r"(?<![A-Z0-9._%+-])([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})(?![A-Z0-9._%+-])",
    re.IGNORECASE,
)

PHONE_PATTERN = re.compile(
    r"(?<!\d)(?:\+\d[\d\s().-]{6,}\d|0\d[\d\s().-]{7,}\d)(?!\d)"
)

URL_PATTERN = re.compile(
    r"(?i)\b(?:https?://|www\.)\S+"
)

LINKEDIN_PATTERN = re.compile(r"(?i)\blinkedin\.com/\S+")
GITHUB_PATTERN = re.compile(r"(?i)\bgithub\.com/\S+")
