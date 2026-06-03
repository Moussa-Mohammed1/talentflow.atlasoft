from __future__ import annotations

from app.services.skill_extraction.constants import HEADER_TERMS
from app.services.skill_extraction.ontology import SkillOntology


class LayoutSignalExtractor:
    SPLIT_CHARS = {",", ";", "|", "•", "▪", "►", "●", "○", "★", "✓", "*", "\t"}
    BULLET_CHARS = {"-", "•", "▪", "►", "●", "○", "★", "✓", "*"}
    SKILL_LABEL_WORDS = {
        "base",
        "bases",
        "competence",
        "competences",
        "database",
        "databases",
        "donnee",
        "donnees",
        "environnement",
        "framework",
        "frameworks",
        "langage",
        "langages",
        "logiciel",
        "logiciels",
        "outil",
        "outils",
        "skill",
        "skills",
        "stack",
        "technologie",
        "technologies",
        "tool",
        "tools",
        "versioning",
    }
    LANGUAGE_WORDS = {
        "anglais",
        "arabic",
        "arabe",
        "english",
        "francais",
        "french",
        "langue",
        "language",
        "maternelle",
        "native",
        "niveau",
    }

    def __init__(self, ontology: SkillOntology) -> None:
        self.ontology = ontology

    @staticmethod
    def word_count(value: str) -> int:
        return sum(1 for part in value.replace("/", " ").replace("-", " ").split() if any(char.isalnum() for char in part))

    @staticmethod
    def line_start_positions(text: str) -> list[tuple[int, str]]:
        positions: list[tuple[int, str]] = []
        cursor = 0
        for line in text.splitlines():
            positions.append((cursor, line))
            cursor += len(line) + 1
        return positions

    @classmethod
    def is_structured_line(cls, line: str) -> bool:
        stripped = line.strip()
        if not stripped:
            return False
        if stripped[0] in cls.BULLET_CHARS:
            return True
        if sum(stripped.count(delimiter) for delimiter in cls.SPLIT_CHARS) >= 2:
            return True
        if ":" in stripped:
            left = stripped.split(":", 1)[0]
            left_key = SkillOntology.normalize_key(left)
            return any(word in left_key.split() for word in cls.SKILL_LABEL_WORDS)
        return False

    @classmethod
    def split_skill_line(cls, line: str) -> list[str]:
        working = line.strip()
        if ":" in working:
            left, right = working.split(":", 1)
            left_key = SkillOntology.normalize_key(left)
            if len(left_key.split()) <= 5 and (
                any(word in left_key.split() for word in cls.SKILL_LABEL_WORDS) or right.count(",") > 0
            ):
                if not right.strip():
                    return []
                working = right

        parts: list[str] = []
        current: list[str] = []
        for char in working:
            if char in cls.SPLIT_CHARS:
                item = "".join(current).strip()
                if item:
                    parts.append(item)
                current = []
                continue
            current.append(char)

        item = "".join(current).strip()
        if item:
            parts.append(item)
        return parts or [working]

    def has_skill_label(self, line: str) -> bool:
        return bool(set(self.ontology.normalize_key(line).split()) & self.SKILL_LABEL_WORDS)

    def looks_like_header(self, value: str) -> bool:
        normalized = self.ontology.normalize_key(value)
        compact = normalized.replace(" ", "")
        return normalized in HEADER_TERMS or compact in {term.replace(" ", "") for term in HEADER_TERMS}

    def looks_like_language_level(self, value: str) -> bool:
        if ":" not in value:
            return False
        return bool(set(self.ontology.normalize_key(value).split()) & self.LANGUAGE_WORDS)

    def looks_like_metadata_value(self, value: str) -> bool:
        digit_count = sum(1 for character in value if character.isdigit())
        alpha_count = sum(1 for character in value if character.isalpha())
        return digit_count >= 6 and digit_count > alpha_count and any(character in value for character in {":", "-"})

    def has_skill_surface(self, value: str, *, list_item: bool = False) -> bool:
        if self.has_strong_skill_surface(value):
            return True
        cleaned = self.ontology.clean_surface(value)
        words = cleaned.replace("-", " ").split()
        if list_item and len(words) <= 3 and any(word[:1].isupper() for word in words):
            return True
        return False

    def has_strong_skill_surface(self, value: str) -> bool:
        cleaned = self.ontology.clean_surface(value)
        if not cleaned:
            return False
        if self.ontology.resolve_concept(cleaned) is not None:
            return True
        if any(character.isdigit() for character in cleaned):
            return True
        if any(character in cleaned for character in (".", "+", "#", "/")):
            return True

        words = cleaned.replace("-", " ").split()
        if any(word.isupper() and 2 <= len(word) <= 6 for word in words):
            return True
        if any(any(character.islower() for character in word) and any(character.isupper() for character in word[1:]) for word in words):
            return True
        return False
