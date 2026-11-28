from __future__ import annotations

from app.schemas.evaluation_checks import (
    ExtractionEvalCase,
    GroundingEvalCase,
    MatchEvalCandidate,
    MatchEvalCase,
)

EXTRACTION_EVAL_DATASET: list[ExtractionEvalCase] = [
    ExtractionEvalCase(
        case_id="ext-01-python-backend-en",
        description="English Senior Python / FastAPI backend CV with skill aliases",
        raw_text=(
            "Sara Benali\n"
            "Senior Backend Engineer - Casablanca, Morocco\n"
            "Skills: Python, FastAPI, postgres, Docker, k8s, Redis\n"
            "Experience:\n"
            "Senior Backend Engineer | AtlasTech (2021 - Present)\n"
            "Software Engineer | CloudOps (2018 - 2021)\n"
            "Languages: English (Fluent), French (Native)\n"
        ),
        expected_skills=["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes", "Redis"],
        expected_languages=["English", "French"],
        expected_role="Senior Backend Engineer",
        expected_location="Casablanca",
    ),
    ExtractionEvalCase(
        case_id="ext-02-frontend-fr",
        description="French Frontend React / TypeScript CV",
        raw_text=(
            "Youssef El Mansouri\n"
            "Développeur Frontend - Rabat, Maroc\n"
            "Compétences: React, Next.js, TypeScript, Tailwind CSS, Git\n"
            "Expérience:\n"
            "Développeur Frontend | WebFactory (2022 - 2025)\n"
            "Langues: Français (Natif), Anglais (Professionnel)\n"
        ),
        expected_skills=["React", "Next.js", "TypeScript", "Tailwind CSS", "Git"],
        expected_languages=["French", "English"],
        expected_role="Développeur Frontend",
        expected_location="Rabat",
    ),
    ExtractionEvalCase(
        case_id="ext-03-ml-rag-en",
        description="ML / AI Engineer CV with NLP & vector database skills",
        raw_text=(
            "Amine Haddad\n"
            "Machine Learning Engineer - Paris, France\n"
            "Skills: Python, PyTorch, Hugging Face, LangChain, PostgreSQL, Docker\n"
            "Languages: French, English, Arabic\n"
        ),
        expected_skills=["Python", "PyTorch", "PostgreSQL", "Docker"],
        expected_languages=["French", "English", "Arabic"],
        expected_role="Machine Learning Engineer",
        expected_location="Paris",
    ),
    ExtractionEvalCase(
        case_id="ext-04-devops-bilingual",
        description="DevOps & Cloud Engineer CV with Terraform and CI/CD",
        raw_text=(
            "Nadia Karimi\n"
            "DevOps Engineer - Lyon, France\n"
            "Skills: Terraform, Kubernetes, Docker, AWS, Linux, Python\n"
            "Langues: Français, Anglais\n"
        ),
        expected_skills=["Terraform", "Kubernetes", "Docker", "AWS", "Linux", "Python"],
        expected_languages=["French", "English"],
        expected_role="DevOps Engineer",
        expected_location="Lyon",
    ),
]

MATCHING_EVAL_DATASET: list[MatchEvalCase] = [
    MatchEvalCase(
        case_id="match-01-senior-python-rag",
        description="Senior Python & PostgreSQL Backend role ranking relevant backend engineers above frontend/junior profiles",
        job_query="Senior Python Backend Engineer building FastAPI APIs, PostgreSQL pgvector search, and Docker services in Casablanca.",
        required_skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        preferred_skills=["Kubernetes", "Redis"],
        target_role="Backend Engineer",
        target_location="Casablanca",
        min_experience_years=4.0,
        expected_top_candidate_id=101,
        candidates=[
            MatchEvalCandidate(
                candidate_id=101,
                fullname="Sara Benali",
                skills=["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"],
                current_role="Senior Backend Engineer",
                location="Casablanca",
                total_experience_years=6.0,
                summary="Built FastAPI microservices, PostgreSQL pgvector pipelines, and Docker deployments.",
                relevant=True,
                relevance_grade=3,
            ),
            MatchEvalCandidate(
                candidate_id=102,
                fullname="Omar Tazi",
                skills=["Python", "Django", "PostgreSQL"],
                current_role="Backend Engineer",
                location="Rabat",
                total_experience_years=3.0,
                summary="Backend developer working with Python and relational databases.",
                relevant=True,
                relevance_grade=2,
            ),
            MatchEvalCandidate(
                candidate_id=103,
                fullname="Lina Mansour",
                skills=["React", "TypeScript", "Figma", "CSS"],
                current_role="UI/UX Frontend Developer",
                location="Paris",
                total_experience_years=5.0,
                summary="Frontend designer and React developer.",
                relevant=False,
                relevance_grade=0,
            ),
        ],
    ),
    MatchEvalCase(
        case_id="match-02-frontend-nextjs",
        description="Frontend Next.js / TypeScript role ranking React/Next.js specialist first",
        job_query="Frontend Engineer specializing in React, Next.js, and TypeScript in Paris.",
        required_skills=["React", "Next.js", "TypeScript"],
        preferred_skills=["Tailwind CSS"],
        target_role="Frontend Engineer",
        target_location="Paris",
        min_experience_years=2.0,
        expected_top_candidate_id=201,
        candidates=[
            MatchEvalCandidate(
                candidate_id=201,
                fullname="Claire Moreau",
                skills=["React", "Next.js", "TypeScript", "Tailwind CSS", "Git"],
                current_role="Frontend Engineer",
                location="Paris",
                total_experience_years=4.0,
                summary="Led React and Next.js web apps in TypeScript with Tailwind CSS.",
                relevant=True,
                relevance_grade=3,
            ),
            MatchEvalCandidate(
                candidate_id=202,
                fullname="Karim Idrissi",
                skills=["Java", "Spring Boot", "Oracle"],
                current_role="Java Backend Developer",
                location="Casablanca",
                total_experience_years=7.0,
                summary="Enterprise Java and Oracle SQL developer.",
                relevant=False,
                relevance_grade=0,
            ),
            MatchEvalCandidate(
                candidate_id=203,
                fullname="Mehdi Alaoui",
                skills=["React", "JavaScript"],
                current_role="Junior Web Developer",
                location="Lyon",
                total_experience_years=1.0,
                summary="Junior React web developer.",
                relevant=True,
                relevance_grade=1,
            ),
        ],
    ),
]

GROUNDING_EVAL_DATASET: list[GroundingEvalCase] = [
    GroundingEvalCase(
        case_id="grd-01-valid-cited",
        description="Valid summary citing existing evidence IDs with accurate skills and experience",
        candidate_skills=["Python", "FastAPI", "PostgreSQL"],
        missing_skills=["Kubernetes"],
        candidate_experience_years=5.0,
        available_evidence_ids=["cand:1:profile", "cand:1:skills", "match:1:job1:signals"],
        claims=[
            {"claim": "Candidate has 5.0 years of experience.", "evidence_ids": ["cand:1:profile"]},
            {"claim": "Candidate has Python, FastAPI, PostgreSQL.", "evidence_ids": ["cand:1:skills"]},
        ],
        generated_text=(
            "The candidate has 5 years of experience and brings strong Python and FastAPI skills. "
            "Note that Kubernetes is missing from the retrieved profile."
        ),
        expected_grounded=True,
    ),
    GroundingEvalCase(
        case_id="grd-02-hallucinated-skill",
        description="Hallucinated claim attributing a missing skill (Kubernetes) to the candidate",
        candidate_skills=["Python", "FastAPI"],
        missing_skills=["Kubernetes"],
        candidate_experience_years=3.0,
        available_evidence_ids=["cand:2:profile", "cand:2:skills"],
        claims=[
            {"claim": "Candidate is proficient in Kubernetes.", "evidence_ids": ["cand:2:skills"]},
        ],
        generated_text="The candidate is proficient in Kubernetes and has strong Python skills.",
        expected_grounded=False,
    ),
    GroundingEvalCase(
        case_id="grd-03-fabricated-citation",
        description="Claim referencing a non-existent evidence ID",
        candidate_skills=["React", "TypeScript"],
        missing_skills=[],
        candidate_experience_years=2.0,
        available_evidence_ids=["cand:3:profile", "cand:3:skills"],
        claims=[
            {"claim": "Candidate led a 20-person team.", "evidence_ids": ["cand:3:fabricated_chunk"]},
        ],
        generated_text="Candidate led a 20-person engineering team.",
        expected_grounded=False,
    ),
    GroundingEvalCase(
        case_id="grd-04-inflated-years",
        description="Claim inflating candidate experience from 2.0 years to 10 years",
        candidate_skills=["Python"],
        missing_skills=[],
        candidate_experience_years=2.0,
        available_evidence_ids=["cand:4:profile", "cand:4:skills"],
        claims=[
            {"claim": "Candidate has 10 years of experience.", "evidence_ids": ["cand:4:profile"]},
        ],
        generated_text="The candidate has 10 years of experience in backend systems.",
        expected_grounded=False,
    ),
]
