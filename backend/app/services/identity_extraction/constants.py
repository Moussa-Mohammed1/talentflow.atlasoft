from __future__ import annotations

import re


NAME_BLACKLIST = {
    "developer",
    "Développeur",
    "engineer",
    "software engineer",
    "student",
    "intern",
    "experience",
    "summary",
    "profile",
    "contact",
    "resume",
    "curriculum vitae",
    "cv",
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
    "software engineer",
    "student",
    "intern",
    "experience",
    "summary",
    "profile",
    "contact",
    "resume",
    "curriculum vitae",
    "cv",
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

NON_PERSON_NAME_TOKENS = {
    "desktop",
    "mobile",
    "web",
    "application",
    "applications",
    "frontend",
    "backend",
    "fullstack",
    "full stack",
    "development",
    "developpement",
    "design",
    "project",
    "projects",
    "solution",
    "solutions",
    "system",
    "systems",
}

NAME_JOB_TITLE_TERMS = {
    "developer",
    "engineer",
    "software engineer",
    "frontend",
    "front end",
    "backend",
    "back end",
    "full stack",
    "fullstack",
    "devops",
    "administrator",
    "architect",
    "analyst",
    "manager",
    "director",
    "lead",
    "principal",
    "consultant",
    "specialist",
    "scientist",
    "researcher",
    "student",
    "intern",
    "associate",
    "trainee",
    "qa",
    "tester",
    "technician",
    "product manager",
    "project manager",
}

NAME_TECHNICAL_TERMS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "node",
    "angular",
    "vue",
    "nextjs",
    "django",
    "flask",
    "spring",
    "sql",
    "nosql",
    "aws",
    "azure",
    "docker",
    "kubernetes",
    "terraform",
    "html",
    "css",
    "git",
    "linux",
    "devops",
    "api",
    "rest",
    "graphql",
    "php",
    "c#",
    "csharp",
    "dotnet",
    "go",
    "golang",
    "rust",
    "kotlin",
    "swift",
    "flutter",
    "react native",
    "machine learning",
    "artificial intelligence",
    "data science",
    "ai",
    "ml",
}

NAME_SECTION_TITLES = {
    "experience",
    "education",
    "skills",
    "profile",
    "summary",
    "contact",
    "projects",
    "certifications",
    "languages",
    "references",
    "objective",
}

NAME_MIN_WORDS = 2
NAME_MAX_WORDS = 4
NAME_HEADER_LINE_LIMIT = 12
NAME_TOP_LINE_LIMIT = 8
NAME_SCAN_LINE_LIMIT = 20
NAME_OUTPUT_LIMIT = 5

NAME_SCORE_WEIGHTS = {
    "ner": 30,
    "header": 30,
    "near_contact": 20,
    "first_lines": 15,
    "valid_structure": 10,
    "repeated": 10,
    "digits": -50,
    "blacklist": -50,
    "job_title": -30,
    "technical": -30,
    "length": -20,
    "address": -20,
    "contact_like": -30,
    "uppercase_title": -30,
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
