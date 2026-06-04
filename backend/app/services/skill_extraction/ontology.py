import unicodedata

from sklearn.metrics.pairwise import cosine_similarity

from app.services.skill_extraction.concepts import CONCEPTS
from app.services.skill_extraction.constants import DOMAIN_HINTS
from app.services.skill_extraction.models import SkillConcept
try:
    from sentence_transformers import SentenceTransformer
except Exception: 
    SentenceTransformer = None


class SkillOntology:
    def __init__(self) -> None:
        self.concepts = list(CONCEPTS)
        self.alias_to_concept: dict[str, SkillConcept] = {}
        for concept in self.concepts:
            for alias in (concept.canonical, *concept.aliases):
                self.alias_to_concept[self.normalize_key(alias)] = concept

        self.category_profiles = {
            "Technology": "general technology products, services, APIs, and IT tools",
            "Framework": "application frameworks and libraries used to structure software delivery",
            "Programming Language": "programming languages and language syntax ecosystems",
            "Database": "database engines, data stores, and query platforms",
            "Cloud Platform": "cloud providers, cloud services, and cloud infrastructure platforms",
            "DevOps Tool": "CI/CD, containers, orchestration, automation, and infrastructure tooling",
            "Networking Technology": "networking protocols, routing, switching, systems, and infrastructure",
            "Cybersecurity": "security controls, security operations, incident response, and protection tooling",
            "Methodology": "delivery methodologies, operating models, and process frameworks",
            "Soft Skill": "human and interpersonal skills such as communication and collaboration",
            "Business Skill": "business operations, commercial, analytical, and organizational skills",
            "Domain Knowledge": "industry knowledge and subject matter expertise across sectors",
            "Competency": "applied abilities expressed as end-to-end professional competencies",
        }
        self._embedding_model = None
        self._category_embeddings = None
        self._concept_embeddings = None

    @staticmethod
    def strip_accents(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value)
        return "".join(character for character in normalized if not unicodedata.combining(character))

    @classmethod
    def normalize_key(cls, value: str) -> str:
        value = cls.strip_accents(value).casefold()
        normalized_characters = [
            character if character.isalnum() or character in {"+", "#", "."} else " "
            for character in value
        ]
        return " ".join("".join(normalized_characters).split())

    @staticmethod
    def clean_surface(value: str) -> str:
        value = unicodedata.normalize("NFKC", value).replace("\u00a0", " ")
        value = value.replace("▁", " ").replace("Ġ", " ")
        value = " ".join(value.split())
        return value.strip(" \t\r\n-–—,;:.()[]{}<>\"'`|")

    def resolve_concept(self, value: str) -> SkillConcept | None:
        concept = self.alias_to_concept.get(self.normalize_key(value))
        if concept is not None:
            return concept
        return None

    def normalize(self, value: str) -> str:
        concept = self.resolve_concept(value)
        if concept is not None:
            return concept.canonical

        cleaned = self.clean_surface(value)
        key = self.normalize_key(cleaned)

        special_cases = {
            "vue js": "Vue.js",
            "vuejs": "Vue.js",
            "postgres": "PostgreSQL",
            "node js": "Node.js",
            "nodejs": "Node.js",
            "express js": "Express.js",
            "fast api": "FastAPI",
            "rest api": "REST API",
            "rest apis": "REST API",
            "api rest": "REST API",
            "object oriented programming": "Object-Oriented Programming",
            "oop": "Object-Oriented Programming",
            "poo": "Object-Oriented Programming",
            "scientific communication": "Scientific Communication",
            "full stack application design": "Full-Stack Application Design",
            "project management": "Project Management",
            "agile methodology": "Agile Methodology",
            "machine learning": "Machine Learning",
            "artificial intelligence": "Artificial Intelligence",
            "data science": "Data Science",
            "network administration": "Network Administration",
        }
        if key in special_cases:
            return special_cases[key]

        if len(cleaned) <= 5 and cleaned.isupper():
            return cleaned

        if any(character in cleaned for character in (".", "+", "#", "/", "-")):
            return cleaned

        words = [word for word in cleaned.split() if word]
        if not words:
            return cleaned

        canonical_words = []
        for word in words:
            if word.isupper() and len(word) <= 5:
                canonical_words.append(word)
            elif "." in word and all(part.isalpha() for part in word.split(".") if part):
                canonical_words.append(word)
            else:
                canonical_words.append(word[:1].upper() + word[1:].lower())

        return " ".join(canonical_words)

    def category_for(self, value: str, section: str | None = None, semantic_hint: float = 0.0) -> tuple[str, str | None, float]:
        concept = self.resolve_concept(value)
        if concept is not None:
            return concept.category, concept.canonical, 1.0

        category = self._category_by_heuristics(value, section)
        if category is not None:
            return category, None, max(semantic_hint, 0.55)

        score, category = self._best_category_by_embedding(value)
        if category is not None:
            return category, None, score

        return "Competency", None, semantic_hint

    def _category_by_heuristics(self, value: str, section: str | None = None) -> str | None:
        key = self.normalize_key(value)
        if not key:
            return None

        if any(term in key for term in ("agile", "scrum", "kanban", "waterfall", "itil")):
            return "Methodology"
        if any(term in key for term in ("leadership", "communication", "collaboration", "adaptability", "team")):
            return "Soft Skill"
        if any(term in key for term in ("management", "analysis", "design", "development", "configuration", "administration", "implementation", "optimization", "coordination", "training", "migration")):
            return "Competency"
        if any(term in key for term in DOMAIN_HINTS):
            return "Domain Knowledge"
        if any(separator in value for separator in (".", "+", "#", "/", "-")):
            if any(term in key for term in ("postgres", "mysql", "database", "sql")):
                return "Database"
            if any(term in key for term in ("docker", "kubernetes", "terraform", "jenkins", "ansible", "git")):
                return "DevOps Tool"
            if any(term in key for term in ("laravel", "vue", "react", "django", "flask", "fastapi", "express", "next")):
                return "Framework"
            return "Technology"
        if section == "technical_skills":
            return "Technology"
        return None

    def ensure_embeddings(self) -> None:
        if self._embedding_model is not None:
            return
        if SentenceTransformer is None:
            return
        try:
            self._embedding_model = SentenceTransformer(
                "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                local_files_only=True,
            )
        except Exception:
            self._embedding_model = None
            return

        category_texts = [f"{category}: {description}" for category, description in self.category_profiles.items()]
        self._category_embeddings = self._embedding_model.encode(category_texts, normalize_embeddings=True)

        concept_texts = [f"{concept.canonical}. {concept.description}. {', '.join(concept.aliases)}" for concept in self.concepts]
        self._concept_embeddings = self._embedding_model.encode(concept_texts, normalize_embeddings=True)

    def _best_category_by_embedding(self, value: str) -> tuple[float, str | None]:
        self.ensure_embeddings()
        if self._embedding_model is None or self._category_embeddings is None:
            return 0.0, None
        candidate_embedding = self._embedding_model.encode([value], normalize_embeddings=True)
        similarities = cosine_similarity(candidate_embedding, self._category_embeddings)[0]
        best_index = int(similarities.argmax())
        best_score = float(similarities[best_index])
        if best_score < 0.35:
            return best_score, None
        category = list(self.category_profiles.keys())[best_index]
        return best_score, category

    def semantic_score(self, value: str) -> float:
        concept = self.resolve_concept(value)
        if concept is not None:
            return 1.0

        self.ensure_embeddings()
        if self._embedding_model is None or self._concept_embeddings is None:
            return 0.0

        candidate_embedding = self._embedding_model.encode([value], normalize_embeddings=True)
        similarities = cosine_similarity(candidate_embedding, self._concept_embeddings)[0]
        best_score = float(similarities.max())
        return best_score

    def closest_concept(self, value: str) -> tuple[str | None, float]:
        concept = self.resolve_concept(value)
        if concept is not None:
            return concept.canonical, 1.0

        self.ensure_embeddings()
        if self._embedding_model is None or self._concept_embeddings is None:
            return None, 0.0

        candidate_embedding = self._embedding_model.encode([value], normalize_embeddings=True)
        similarities = cosine_similarity(candidate_embedding, self._concept_embeddings)[0]
        best_index = int(similarities.argmax())
        best_score = float(similarities[best_index])
        if best_score < 0.42:
            return None, best_score
        return self.concepts[best_index].canonical, best_score

    def concept_for(self, value: str) -> SkillConcept | None:
        concept = self.resolve_concept(value)
        if concept is not None:
            return concept
        canonical, score = self.closest_concept(value)
        if canonical is None or score < 0.45:
            return None
        for item in self.concepts:
            if item.canonical == canonical:
                return item
        return None

