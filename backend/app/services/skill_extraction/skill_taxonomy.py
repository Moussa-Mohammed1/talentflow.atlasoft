from __future__ import annotations

from dataclasses import dataclass
import json
import os
import unicodedata
from functools import lru_cache
from pathlib import Path


def _normalize_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    normalized = normalized.encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = normalized.replace("/", " ")
    normalized = normalized.replace("-", " ")
    normalized = normalized.replace("_", " ")
    normalized = normalized.replace("+", " plus ")
    normalized = normalized.replace("#", " sharp ")
    normalized = " ".join(normalized.split())
    return normalized


@dataclass(frozen=True)
class TaxonomyEntry:
    canonical: str
    category: str
    aliases: tuple[str, ...]
    domains: tuple[str, ...] = ()

    @property
    def normalized_canonical(self) -> str:
        return _normalize_key(self.canonical)


DEFAULT_SECTION_ALIASES = {
    "profile": (
        "profile",
        "summary",
        "about",
        "about me",
        "personal profile",
        "objective",
        "professional summary",
    ),
    "experience": (
        "experience",
        "work experience",
        "professional experience",
        "career history",
        "employment history",
    ),
    "projects": (
        "projects",
        "project",
        "selected projects",
        "academic projects",
    ),
    "technical skills": (
        "technical skills",
        "skills",
        "skills section",
        "competences",
        "competences techniques",
        "hard skills",
    ),
    "certifications": (
        "certifications",
        "certificates",
        "training",
    ),
    "education": (
        "education",
        "education and training",
        "formation",
        "academic background",
    ),
    "languages": (
        "languages",
        "langues",
        "spoken languages",
    ),
    "interests": (
        "interests",
        "interests and hobbies",
        "centres d interet",
        "hobbies",
    ),
}


DEFAULT_TAXONOMY: tuple[TaxonomyEntry, ...] = (
    TaxonomyEntry("Laravel", "Framework", ("laravel",)),
    TaxonomyEntry("Vue.js", "Framework", ("vue", "vue js", "vue.js", "vuejs")),
    TaxonomyEntry("React", "Framework", ("react", "reactjs", "react.js")),
    TaxonomyEntry("Angular", "Framework", ("angular", "angularjs")),
    TaxonomyEntry("Django", "Framework", ("django",)),
    TaxonomyEntry("FastAPI", "Framework", ("fastapi", "fast api")),
    TaxonomyEntry("Spring Boot", "Framework", ("spring boot", "springboot")),
    TaxonomyEntry("REST API", "Technology", ("rest api", "rest apis", "api rest")),
    TaxonomyEntry("HTML", "Technology", ("html", "html5")),
    TaxonomyEntry("CSS", "Technology", ("css", "css3")),
    TaxonomyEntry("JavaScript", "Programming Language", ("javascript", "js")),
    TaxonomyEntry("TypeScript", "Programming Language", ("typescript", "ts")),
    TaxonomyEntry("Git", "DevOps Tool", ("git",)),
    TaxonomyEntry("GitHub", "DevOps Tool", ("github",)),
    TaxonomyEntry("Docker", "DevOps Tool", ("docker",)),
    TaxonomyEntry("Kubernetes", "DevOps Tool", ("kubernetes", "k8s")),
    TaxonomyEntry("Terraform", "DevOps Tool", ("terraform",)),
    TaxonomyEntry("Jenkins", "DevOps Tool", ("jenkins",)),
    TaxonomyEntry("Ansible", "DevOps Tool", ("ansible",)),
    TaxonomyEntry("Linux", "Technology", ("linux",)),
    TaxonomyEntry("Tailwind CSS", "Technology", ("tailwind css", "tailwind", "tailwindcss")),
    TaxonomyEntry("Figma", "Technology", ("figma",)),
    TaxonomyEntry("Photoshop", "Technology", ("photoshop",)),
    TaxonomyEntry("Python", "Programming Language", ("python",)),
    TaxonomyEntry("PHP", "Programming Language", ("php",)),
    TaxonomyEntry("Java", "Programming Language", ("java",)),
    TaxonomyEntry("C", "Programming Language", ("c",)),
    TaxonomyEntry("C++", "Programming Language", ("c plus plus", "c++")),
    TaxonomyEntry("C#", "Programming Language", ("c sharp", "c#")),
    TaxonomyEntry("SQL", "Programming Language", ("sql",)),
    TaxonomyEntry("R", "Programming Language", ("r language", "r")),
    TaxonomyEntry("PostgreSQL", "Database", ("postgresql", "postgres", "postgre sql")),
    TaxonomyEntry("MySQL", "Database", ("mysql",)),
    TaxonomyEntry("SQLite", "Database", ("sqlite",)),
    TaxonomyEntry("MongoDB", "Database", ("mongodb", "mongo db")),
    TaxonomyEntry("Oracle Database", "Database", ("oracle database", "oracle")),
    TaxonomyEntry("SQL Server", "Database", ("sql server", "mssql")),
    TaxonomyEntry("Redis", "Database", ("redis",)),
    TaxonomyEntry("AWS", "Cloud Platform", ("aws", "amazon web services", "amazon cloud")),
    TaxonomyEntry("Azure", "Cloud Platform", ("azure", "microsoft azure")),
    TaxonomyEntry("Google Cloud Platform", "Cloud Platform", ("gcp", "google cloud", "google cloud platform")),
    TaxonomyEntry("Firebase", "Cloud Platform", ("firebase",)),
    TaxonomyEntry("Network Administration", "Networking Technology", ("network administration",)),
    TaxonomyEntry("Network Routing", "Networking Technology", ("network routing", "routing policies")),
    TaxonomyEntry("Cisco Routing", "Networking Technology", ("cisco routing", "routing", "routing policies")),
    TaxonomyEntry("VLAN Configuration", "Networking Technology", ("vlan configuration", "vlan", "vlans")),
    TaxonomyEntry("TCP/IP", "Networking Technology", ("tcp ip", "tcp/ip")),
    TaxonomyEntry("DNS", "Networking Technology", ("dns",)),
    TaxonomyEntry("DHCP", "Networking Technology", ("dhcp",)),
    TaxonomyEntry("Active Directory", "Networking Technology", ("active directory",)),
    TaxonomyEntry("Wireshark", "Networking Technology", ("wireshark",)),
    TaxonomyEntry("Firewall Administration", "Cybersecurity", ("firewall administration", "firewall", "network firewall")),
    TaxonomyEntry("IAM", "Cybersecurity", ("iam", "identity and access management")),
    TaxonomyEntry("SIEM", "Cybersecurity", ("siem",)),
    TaxonomyEntry("Penetration Testing", "Cybersecurity", ("penetration testing", "pentest", "ethical hacking")),
    TaxonomyEntry("Vulnerability Assessment", "Cybersecurity", ("vulnerability assessment",)),
    TaxonomyEntry("Incident Response", "Cybersecurity", ("incident response",)),
    TaxonomyEntry("Zero Trust", "Cybersecurity", ("zero trust",)),
    TaxonomyEntry("Agile Methodology", "Methodology", ("agile", "agile methodology")),
    TaxonomyEntry("Scrum", "Methodology", ("scrum",)),
    TaxonomyEntry("Kanban", "Methodology", ("kanban",)),
    TaxonomyEntry("Waterfall", "Methodology", ("waterfall",)),
    TaxonomyEntry("DevOps", "Methodology", ("devops",)),
    TaxonomyEntry("Leadership", "Soft Skill", ("leadership",)),
    TaxonomyEntry("Communication", "Soft Skill", ("communication",)),
    TaxonomyEntry("Team Collaboration", "Soft Skill", ("team collaboration", "collaboration", "teamwork")),
    TaxonomyEntry("Problem Solving", "Soft Skill", ("problem solving",)),
    TaxonomyEntry("Adaptability", "Soft Skill", ("adaptability",)),
    TaxonomyEntry("Critical Thinking", "Soft Skill", ("critical thinking",)),
    TaxonomyEntry("Project Management", "Business Skill", ("project management",)),
    TaxonomyEntry("Business Analysis", "Business Skill", ("business analysis",)),
    TaxonomyEntry("Stakeholder Management", "Business Skill", ("stakeholder management",)),
    TaxonomyEntry("Negotiation", "Business Skill", ("negotiation",)),
    TaxonomyEntry("Strategic Planning", "Business Skill", ("strategic planning",)),
    TaxonomyEntry("Machine Learning", "Domain Knowledge", ("machine learning",)),
    TaxonomyEntry("Data Science", "Domain Knowledge", ("data science",)),
    TaxonomyEntry("Healthcare Administration", "Domain Knowledge", ("healthcare administration",)),
    TaxonomyEntry("Financial Analysis", "Domain Knowledge", ("financial analysis",)),
    TaxonomyEntry("Educational Technology", "Domain Knowledge", ("educational technology", "edtech")),
    TaxonomyEntry("Scientific Communication", "Competency", ("scientific communication",)),
    TaxonomyEntry("REST API Development", "Competency", ("rest api development", "api development", "restful api development")),
    TaxonomyEntry("Full-Stack Application Design", "Competency", ("full stack application design", "full stack development", "full stack app design")),
    TaxonomyEntry("Object-Oriented Programming", "Competency", ("object oriented programming", "oop", "poo")),
    TaxonomyEntry("Database Design", "Competency", ("database design",)),
    TaxonomyEntry("Requirements Analysis", "Competency", ("requirements analysis",)),
    TaxonomyEntry("Network Troubleshooting", "Competency", ("network troubleshooting",)),
    TaxonomyEntry("UML Modeling", "Competency", ("uml modeling", "uml")),
    TaxonomyEntry("Merise", "Competency", ("merise",)),
    TaxonomyEntry("API Integration", "Competency", ("api integration",)),
)


DEFAULT_REJECT_TERMS = {
    "education",
    "languages",
    "language",
    "projects",
    "project",
    "experience",
    "summary",
    "profile",
    "interests",
    "interest",
    "technical skills",
    "skills",
    "competences",
    "competence",
    "certifications",
    "certification",
    "objective",
    "formation",
    "projets",
    "langues",
    "intermediaire",
    "beginner",
    "advanced",
    "native",
    "mother tongue",
}


@lru_cache(maxsize=1)
def load_taxonomy() -> tuple[TaxonomyEntry, ...]:
    custom_path = os.getenv("TALENTFLOW_SKILL_TAXONOMY_PATH")
    if not custom_path:
        return DEFAULT_TAXONOMY

    path = Path(custom_path)
    if not path.exists():
        return DEFAULT_TAXONOMY

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return DEFAULT_TAXONOMY

    entries: list[TaxonomyEntry] = []
    for item in payload:
        try:
            entries.append(
                TaxonomyEntry(
                    canonical=str(item["canonical"]),
                    category=str(item["category"]),
                    aliases=tuple(str(alias) for alias in item.get("aliases", [])),
                    domains=tuple(str(domain) for domain in item.get("domains", [])),
                )
            )
        except Exception:
            continue

    return tuple(entries) or DEFAULT_TAXONOMY


def normalize_key(value: str) -> str:
    return _normalize_key(value)


def build_alias_index(entries: tuple[TaxonomyEntry, ...] | None = None) -> dict[str, TaxonomyEntry]:
    index: dict[str, TaxonomyEntry] = {}
    for entry in entries or load_taxonomy():
        index[entry.normalized_canonical] = entry
        for alias in entry.aliases:
            index[normalize_key(alias)] = entry
    return index


def build_section_alias_index() -> dict[str, str]:
    index: dict[str, str] = {}
    for section_name, aliases in DEFAULT_SECTION_ALIASES.items():
        for alias in aliases:
            index[normalize_key(alias)] = section_name
    return index
