from __future__ import annotations

from functools import lru_cache
import re
from typing import Any

import spacy

from app.schemas.cv_pipeline import NEREntityRead, NERExtractionSummary

_KNOWN_LOCATIONS = [
    "Casablanca",
    "Rabat",
    "Marrakech",
    "Tanger",
    "Tangier",
    "Fes",
    "Agadir",
    "Kenitra",
    "Oujda",
    "Morocco",
    "Maroc",
    "Paris",
    "Lyon",
    "Marseille",
    "Toulouse",
    "Lille",
    "Nantes",
    "Bordeaux",
    "France",
    "London",
    "United Kingdom",
    "Berlin",
    "Munich",
    "Germany",
    "Madrid",
    "Barcelona",
    "Spain",
    "Brussels",
    "Belgium",
    "Geneva",
    "Zurich",
    "Switzerland",
    "Montreal",
    "Toronto",
    "Canada",
    "New York",
    "San Francisco",
    "Remote",
    "Dubai",
    "Tunis",
    "Algiers",
]

_KNOWN_ROLES = [
    "Software Engineer",
    "Senior Software Engineer",
    "Full Stack Developer",
    "Full-Stack Developer",
    "Backend Developer",
    "Frontend Developer",
    "Data Scientist",
    "Data Engineer",
    "Machine Learning Engineer",
    "AI Engineer",
    "DevOps Engineer",
    "Cloud Engineer",
    "Site Reliability Engineer",
    "Product Manager",
    "Project Manager",
    "Tech Lead",
    "Engineering Manager",
    "QA Engineer",
    "Cybersecurity Analyst",
    "Business Analyst",
    "Ingénieur Logiciel",
    "Développeur Full Stack",
    "Développeur Backend",
    "Développeur Frontend",
    "Développeur Python",
    "Architecte Logiciel",
    "Chef de Projet",
]

_LOCATION_LINE_RE = re.compile(
    r"(?im)^(?:location|adresse|address|ville|city|bas[eé]\s+[àa]|residence)\s*[:\-]\s*(.+)$"
)
_ROLE_LINE_RE = re.compile(
    r"(?im)^(?:title|role|poste|intitul[eé]\s+du\s+poste|headline|profil)\s*[:\-]\s*(.+)$"
)


class SpacyNERExtractor:
    """Applies spaCy NER + deterministic EntityRuler patterns to extract CV entities."""

    def __init__(self, nlp: Any | None = None) -> None:
        self._nlp, self.model_name, self.has_statistical_ner = (
            (nlp, getattr(nlp, "meta", {}).get("name", "custom"), "ner" in getattr(nlp, "pipe_names", []))
            if nlp is not None
            else self._load_pipeline()
        )

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_pipeline() -> tuple[Any, str, bool]:
        nlp = None
        model_name = "xx_blank"
        has_ner = False

        for candidate in ("fr_core_news_sm", "en_core_web_sm", "xx_ent_wiki_sm"):
            try:
                nlp = spacy.load(candidate)
                model_name = candidate
                has_ner = "ner" in nlp.pipe_names
                break
            except Exception:
                continue

        if nlp is None:
            nlp = spacy.blank("xx")
            if "sentencizer" not in nlp.pipe_names:
                nlp.add_pipe("sentencizer")

        if "entity_ruler" not in nlp.pipe_names:
            config = {"overwrite_ents": False}
            if has_ner:
                ruler = nlp.add_pipe("entity_ruler", before="ner", config=config)
            else:
                ruler = nlp.add_pipe("entity_ruler", config=config)
            patterns = (
                [{"label": "GPE", "pattern": loc} for loc in _KNOWN_LOCATIONS]
                + [{"label": "ROLE", "pattern": role} for role in _KNOWN_ROLES]
            )
            ruler.add_patterns(patterns)

        return nlp, model_name, has_ner

    def extract(self, text: str) -> NERExtractionSummary:
        if not text or not text.strip():
            return NERExtractionSummary(
                spacy_model=self.model_name,
                has_statistical_ner=self.has_statistical_ner,
            )

        # Cap document length to protect CPU/memory on huge CVs
        doc = self._nlp(text[:40000])

        entities: list[NEREntityRead] = []
        persons: list[str] = []
        organizations: list[str] = []
        locations: list[str] = []
        roles: list[str] = []

        seen_pairs: set[tuple[str, str]] = set()

        def _append_unique(bucket: list[str], label: str, value: str, start: int, end: int, source: str) -> None:
            cleaned = " ".join(value.split()).strip(" ,;|•-")
            if not cleaned:
                return
            key = (label, cleaned.casefold())
            if key in seen_pairs:
                return
            seen_pairs.add(key)
            bucket.append(cleaned)
            entities.append(
                NEREntityRead(
                    text=cleaned,
                    label=label,
                    start_char=start,
                    end_char=end,
                    source=source,
                )
            )

        for ent in getattr(doc, "ents", ()):
            label = ent.label_
            ent_id = getattr(ent, "ent_id_", "") or ""
            source = "spacy_ner" if not ent_id and self.has_statistical_ner else "spacy_ruler"
            if label in {"PER", "PERSON"}:
                _append_unique(persons, "PERSON", ent.text, ent.start_char, ent.end_char, source)
            elif label == "ORG":
                _append_unique(organizations, "ORG", ent.text, ent.start_char, ent.end_char, source)
            elif label in {"GPE", "LOC"}:
                _append_unique(locations, "LOC", ent.text, ent.start_char, ent.end_char, source)
            elif label == "ROLE":
                _append_unique(roles, "ROLE", ent.text, ent.start_char, ent.end_char, source)

        # Explicit labeled header lines for location and role (high precision)
        header_block = "\n".join(text.splitlines()[:25])
        for match in _LOCATION_LINE_RE.finditer(header_block):
            _append_unique(
                locations,
                "LOC",
                match.group(1),
                match.start(1),
                match.end(1),
                "header_pattern",
            )
        for match in _ROLE_LINE_RE.finditer(header_block):
            _append_unique(
                roles,
                "ROLE",
                match.group(1),
                match.start(1),
                match.end(1),
                "header_pattern",
            )

        # Heuristic role detection in top 6 lines if no explicit ROLE entity found
        if not roles:
            for line in text.splitlines()[:6]:
                stripped = line.strip()
                if not stripped or "@" in stripped or any(ch.isdigit() for ch in stripped[:4]):
                    continue
                lowered = stripped.casefold()
                if any(role.casefold() in lowered for role in _KNOWN_ROLES) and len(stripped) <= 90:
                    _append_unique(roles, "ROLE", stripped, 0, len(stripped), "header_headline")
                    break

        return NERExtractionSummary(
            spacy_model=self.model_name,
            has_statistical_ner=self.has_statistical_ner,
            persons=persons,
            organizations=organizations,
            locations=locations,
            roles=roles,
            entities=entities,
        )
