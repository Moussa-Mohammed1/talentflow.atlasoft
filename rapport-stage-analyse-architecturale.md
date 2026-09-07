# Rapport de Stage — Analyse Architecturale du Projet TalentFlow

> **Projet :** TalentFlow — Plateforme IA d'analyse de CV et gestion de recrutement
> **Client :** 3GCOM INT
> **Période :** 7 mai 2026 – 15 juillet 2026
> **Développeur :** Moussa-Mohammed1
> **Stack :** FastAPI + PostgreSQL + Next.js 16 + React 19 + spaCy + sentence-transformers + LLM (Ollama/DeepSeek/Gemini)

---

## Table des Matières

1. [Présentation du Projet](#1-présentation-du-projet)
2. [Stack Technologique](#2-stack-technologique)
3. [Architecture Globale](#3-architecture-globale)
4. [Design Patterns Utilisés](#4-design-patterns-utilisés)
5. [Fonctionnalités Principales](#5-fonctionnalités-principales)
6. [Structure du Projet](#6-structure-du-projet)
7. [Modèle de Données](#7-modèle-de-données)
8. [Surface d'API](#8-surface-dapi)
9. [Points d'Architecture Notables](#9-points-darchitecture-notables)
10. [Chronologie du Développement](#10-chronologie-du-développement)
11. [Analyse Critique](#11-analyse-critique)

---

## 1. Présentation du Projet

TalentFlow est une plateforme web full-stack, bilingue (Français/Anglais), propulsée par l'IA, destinée à l'analyse de CV et à la gestion du recrutement au sein de l'entreprise **3GCOM INT**.

Le système permet :
- L'import de CV (PDF/DOCX)
- L'extraction automatique des données candidats via un pipeline multi-couche (règles, NER, embeddings, LLM)
- L'évaluation et le scoring des candidats
- La gestion complète du cycle de recrutement (11 états)
- Les notifications en temps réel
- La génération d'emails et d'offres d'emploi par IA

**Chiffres clés :**

| Métrique | Valeur |
|----------|--------|
| Fichiers | 415 (219 backend, 192 frontend) |
| Commits | 487 |
| Contributions | 1 développeur |
| Durée | ~2.5 mois |
| Modèles DB | 22 |
| Routes API | ~70 |
| Migrations DB | 29 |

---

## 2. Stack Technologique

### Backend (Python)

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | FastAPI | 0.139.0 |
| Serveur ASGI | Uvicorn | 0.46.0 |
| ORM | SQLAlchemy | 2.0.50 |
| Migrations | Alembic | 1.18.4 |
| Base de données | PostgreSQL | — |
| Authentification | PyJWT (HS256) | 2.13.0 |
| Hashing | passlib (bcrypt) | 1.7.4 |
| Emails | FastAPI-Mail | 1.6.4 |
| Validation | Pydantic | 2.13.4 |

### IA / Machine Learning

| Composant | Technologie | Version |
|-----------|-------------|---------|
| NLP | spaCy (NER) | 3.8.13 |
| Embeddings | sentence-transformers | 5.4.1 |
| Deep Learning | PyTorch | 2.11.0 |
| Transformers | HuggingFace Transformers | 5.8.0 |
| ML | scikit-learn | 1.8.0 |
| PDF | PyMuPDF, pdfplumber | — |
| DOCX | python-docx | 1.2.0 |
| Vision | OpenCV, MediaPipe | 5.0.0, 0.10.35 |
| LLM | Ollama, DeepSeek API, Gemini API | — |

### Frontend (TypeScript)

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | Next.js (App Router) | 16.2.6 |
| UI | React | 19.2.4 |
| Langage | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 |
| State Management | Zustand | 5.0.14 |
| Client HTTP | Axios | 1.16.1 |
| Animations | framer-motion | 12.42.2 |
| Icônes | lucide-react | 1.18.0 |
| PDF Viewer | react-pdf | 10.4.1 |

---

## 3. Architecture Globale

Le projet suit une **architecture en couches** (Layered Architecture) combinée avec les **patterns Repository et Service**.

### Diagramme d'Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       FRONTEND (Next.js 16)                       │
│                                                                   │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────────────┐  │
│  │   Pages  │  │ Composants│  │  Stores  │  │   Services     │  │
│  │App Router│  │ Réutilis. │  │(Zustand) │  │(Axios/API)     │  │
│  └──────────┘  └───────────┘  └──────────┘  └────────────────┘  │
│                                                     │            │
│                           HTTP (Axios)              │            │
└─────────────────────────────────────────────────────┼────────────┘
                                                       │
┌─────────────────────────────────────────────────────┼────────────┐
│                     BACKEND (FastAPI)                │            │
│                                                      │            │
│  ┌──────────────────────────────────────────────────┴─────────┐  │
│  │                     API Router                              │  │
│  │  /auth  /resumes  /evaluate  /recruitments  /jobs          │  │
│  │  /notifications  /settings  /departments  /admin           │  │
│  └─────────┬──────────────┬────────────────┬──────────────────┘  │
│            │              │                │                     │
│    ┌───────┴────┐  ┌─────┴──────┐   ┌────┴────────┐            │
│    │  Services  │  │Repositories│   │   Schemas   │            │
│    │ (Métier)   │  │  (Données) │   │ (Pydantic)  │            │
│    └───────┬────┘  └─────┬──────┘   └─────────────┘            │
│            │              │                                      │
│    ┌───────┴──────────────┴──────────┐                           │
│    │         SQLAlchemy ORM          │                           │
│    │         22 Modèles              │                           │
│    └────────────────┬────────────────┘                           │
│                     │                                            │
│    ┌────────────────┴────────────────┐                           │
│    │         PostgreSQL              │                           │
│    └─────────────────────────────────┘                           │
│                                                                  │
│    ┌───────────────────────────────────────────────────────────┐ │
│    │              Pipelines d'Extraction CV                     │ │
│    │                                                           │ │
│    │  Texte → Identité → Compétences → Expérience → Formation  │ │
│    │       → Certifications → Langues → Photo                 │ │
│    │                      ↓                                    │ │
│    │          Vérification LLM (optionnelle)                   │ │
│    │         (Ollama / DeepSeek / Gemini)                      │ │
│    └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│    ┌───────────────────────────────────────────────────────────┐ │
│    │              Intégrations Externes                         │ │
│    │                                                           │ │
│    │  Ollama (local)  │  DeepSeek API  │  Gemini API           │ │
│    │  LinkedIn OAuth  │  Gmail SMTP    │  spaCy NER            │ │
│    │  sentence-transformers           │  MediaPipe (visage)    │ │
│    └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Flux de Données Principal

```
1. Upload CV (PDF/DOCX)
       │
2. Validation type fichier + UUID storage
       │
3. Extraction texte (PyMuPDF → pdfplumber → python-docx)
       │
4. Pipeline d'extraction (parallélisable) :
       ├── Identité (spaCy NER + regex + scoring)
       ├── Compétences (ontologie + embeddings + scoring)
       ├── Expérience (parsing dates + LLM)
       ├── Formation (règles + LLM)
       ├── Certifications (règles + LLM)
       ├── Langues (détection + niveau)
       └── Photo (MediaPipe détection faciale)
       │
5. Vérification LLM optionnelle (toutes les étapes)
       │
6. Sauvegarde en base de données
       │
7. Évaluation / Scoring candidat
       │
8. Workflow recrutement (11 états)
```

---

## 4. Design Patterns Utilisés

| Pattern | Description | Emplacement |
|---------|-------------|-------------|
| **Repository** | Encapsulation de l'accès aux données, 17 repositories | `backend/app/repositories/` |
| **Service Layer** | Logique métier découplée des contrôleurs | `backend/app/services/` |
| **Pipeline** | Extraction CV en étapes composables et réutilisables | `resume_extraction/`, `skill_extraction/` |
| **Strategy** | 4 providers LLM interchangeables (Ollama, DeepSeek, Gemini, OpenAI-compatible) | `backend/app/services/LLM/` |
| **Dependency Injection** | Injection des dépendances via `Depends()` FastAPI | Tous les route modules |
| **Pub/Sub (WebSocket)** | Notifications temps réel avec gestionnaire de connexions | `notification_manager.py` |
| **Provider Pattern** | Contextes React (Modal, Toast, Session) | `frontend/context/`, `frontend/components/` |
| **State Management** | Stores Zustand pour la gestion d'état client | `frontend/stores/` |

---

## 5. Fonctionnalités Principales

### 5.1 Pipeline d'Analyse de CV (Cœur IA)

Le pipeline d'extraction est le composant le plus sophistiqué du projet. Chaque étape est un module indépendant avec :
- Prétraitement / normalisation
- Extraction basée sur des règles (regex, NER spaCy, heuristiques)
- Extraction ML (embeddings sentence-transformers)
- Vérification LLM optionnelle
- Scoring / classement des résultats

#### 5.1.1 Upload et Validation
- Types supportés : PDF, DOCX
- Stockage : UUID-named dans `/storage/resumes/`
- Détection des doublons par email/téléphone
- Validation type MIME

#### 5.1.2 Extraction de Texte
- **Primaire :** PyMuPDF (rapide, précis)
- **Fallback :** pdfplumber (PDF complexes)
- **DOCX :** python-docx

#### 5.1.3 Extraction d'Identité (13 fichiers)
- **Nom :** spaCy NER (entités nommées)
- **Email :** regex patterns
- **Téléphone :** regex multi-formats
- **Scoring :** heuristique avec filtrage blacklist
- **LLM :** vérification optionnelle

#### 5.1.4 Extraction de Compétences (17 fichiers)
- Détection de sections dans le CV
- Extraction des candidats-compétences
- Matching ontologique (taxonomie ~430 entrées)
- Similarité embeddings (sentence-transformers)
- Scoring avec validation
- Vérification LLM

**Sous-composants :**
- `SkillOntology`, `SkillTaxonomy` — base de connaissances
- `CandidateExtractor` — extraction des mentions
- `ResumeSectionAnalyzer` — analyse des sections
- `OntologyMatcher` — matching ontologique
- `EmbeddingSkillMatcher` — matching par similarité
- `LayoutSignalExtractor` — signaux de mise en page
- `SkillScorer` — scoring des compétences

#### 5.1.5 Extraction d'Expérience
- Parsing multi-format de dates (FR/EN)
- Extraction des blocs d'expérience
- Vérification LLM

#### 5.1.6 Extraction de Formation
- Institution, diplôme, domaine d'études
- Périodes (début/fin)
- Vérification LLM

#### 5.1.7 Extraction de Certifications
- Nom, organisation émettrice
- Dates d'obtention/expiration
- ID crédencial, URL
- Vérification LLM

#### 5.1.8 Extraction de Langues
- Nom de la langue
- Niveau de compétence
- Vérification LLM

#### 5.1.9 Extraction de Photo
- Détection faciale via MediaPipe
- Extraction et normalisation
- Classement et stockage

#### 5.1.10 Génération d'Aperçu
- Rendu PDF en images pour prévisualisation navigateur

---

### 5.2 Authentification et Gestion des Utilisateurs

| Fonctionnalité | Détails |
|----------------|---------|
| **JWT Authentication** | HS256, 12h d'expiration, cookie `httpOnly` + localStorage |
| **Login restreint** | Email/password, domaine `@3gcom-int.com` uniquement |
| **LinkedIn OAuth** | OAuth 2.0, validation d'état, échange de token, récupération infos utilisateur |
| **Inscription sur invitation** | Admin envoie invitation (48h), email via SMTP, token d'expiration |
| **Mot de passe oublié** | OTP 6 chiffres par email, 15min d'expiration |
| **Gestion de profil** | Upload avatar (validation image), nom/email, changement mot de passe |
| **Suppression de compte** | Suppression complète avec nettoyage cookies |
| **Contrôle d'accès** | 3 rôles : `admin`, `recruiter`, `employee` |
| **Session persistante** | Restoration automatique au rechargement, middleware de protection |

---

### 5.3 Gestion du Recrutement

| Fonctionnalité | Détails |
|----------------|---------|
| **Offres d'emploi CRUD** | Création, lecture, mise à jour, suppression |
| **Génération IA d'offres** | DeepSeek génère une offre complète depuis une description texte |
| **Workflow recrutement** | 10 états : `pending → hired / cancelled` |
| **Planification entretiens** | Types : online/phone/onsite, durée, lieu, intervieweur |
| **Génération d'emails IA** | Emails d'invitation entretien en FR/EN |
| **Envoi d'emails** | SMTP direct via FastAPI-Mail, tracking (draft/queued/sent/failed) |
| **Gestion des priorités** | Low/medium/high avec codes couleurs |
| **Notes de recrutement** | Notes éditable par recrutement |
| **Filtrage** | Par statut, priorité, offre, recruteur |
| **Paginations** | Skip/limit pagination |

#### Workflow de Recrutement (11 états)

```
pending
  │
  ▼
interview_invitation_sent
  │
  ▼
interview_confirmed
  │
  ▼
interview_completed
  │
  ├──► offer_sent ──► offer_accepted ──► hired
  │                 └──► offer_rejected ──► cancelled
  └──► candidate_declined ──► cancelled
```

---

### 5.4 Système d'Évaluation des Candidats

| Fonctionnalité | Détails |
|----------------|---------|
| **Scoring compatible** | Moteur pondéré modulaire |
| **Pondération** | Compétences 40%, Expérience 25%, Formation 15%, Certifications 5%, Langues 5%, Compétences préférées 10% |
| **Matching département** | Comparaison compétences candidat vs compétences requises par département |
| **LLM** | Vérification et ajustement optionnel des scores |
| **Tag "Talent"** | Marquage des talents avec attribution recruteur |
| **Visualisation** | Cartes candidats avec photo, compétences, expérience, langues |

---

### 5.5 Notifications Temps Réel

| Fonctionnalité | Détails |
|----------------|---------|
| **WebSocket** | `NotificationConnectionManager` pattern pub/sub |
| **Types** | success, warning, error, info |
| **CRUD** | Création, liste, marquer lu, tout marquer lu, tout supprimer |
| **Compteur non-lues** | Mise à jour temps réel dans l'UI |
| **Préférences email** | Respecte `notification_enabled` utilisateur |
| **Événements** | Matching candidat terminé, extraction complétée, etc. |

---

### 5.6 Système de Jobs Background

| Fonctionnalité | Détails |
|----------------|---------|
| **Cycle de vie** | pending → running → completed / failed |
| **Types de jobs** | identity_extraction, resume_screening, skill_extraction, experience_extraction, language_extraction, education_extraction, certification_extraction, bulk_data_export, candidate_matching |
| **Gestion** | Liste, création, mise à jour statut, suppression |
| **UI** | Composant `SystemJobs` avec recherche et pagination |

---

### 5.7 Administration

| Fonctionnalité | Détails |
|----------------|---------|
| **Gestion utilisateurs** | Liste complète avec statistiques (nombre CV, usage LLM) |
| **Gestion des rôles** | Mise à jour depuis le panneau admin |
| **Tracking LLM** | Table `llm_usage` : tokens, modèle, action, durée |

---

### 5.8 Gestion des Départements

| Fonctionnalité | Détails |
|----------------|---------|
| **CRUD départements** | Nom, années d'expérience requises |
| **Compétences requises** | Chaque département peut avoir des compétences obligatoires |
| **UI** | Modales CRUD, détail avec compétences |

---

### 5.9 Pages Frontend (14 Groupes de Routes)

| Page | Route | Composants Clés |
|------|-------|-----------------|
| Login | `/login` | LoginForm (email/password + LinkedIn OAuth + forgot password) |
| Dashboard | `/dashboard` | 4 cartes navigation + guide + activités récentes |
| Documents | `/documents` | Liste CV, 6 modales d'import, preview, infos, suppression |
| Évaluations | `/evaluations` | EvaluatedCandidateCard, EvaluationDetailModal |
| Talents | `/talents` | Liste talents, RecruitModal |
| Recrutements | `/recruitments` | RecruitmentCard, RecruitmentDetailModal (onglets) |
| Offres d'emploi | `/jobs` | SystemJobs, JobOfferCard, CreateOfferModal, DetailModal |
| Invitations | `/invitations` | InvitationFormModal, accept-invitation |
| Paramètres | `/settings` | Onglets Notifications/Sécurité/Invitations |
| Profil | `/profile` | ProfileSection, avatar, mot de passe |
| Admin | `/admin` | Gestion utilisateurs + rôles + stats |
| Ressources | `/resources` | Départements CRUD |
| Aide | `/help` | Documentation complète avec sidebar |
| 404 | `/not-found` | Page personnalisée |

---

## 6. Structure du Projet

### Arborescence Racine

```
TalentFlow/
├── Conception UML/          # Diagrammes (cas d'utilisation, classes, flux)
├── backend/                 # API Python FastAPI
├── frontend/                # Application Next.js React
├── storage/                 # Fichiers uploadés (CV, avatars)
├── AUDIT.md                 # Audit complet du codebase
└── .gitignore
```

### Backend (219 fichiers)

```
backend/
├── app/
│   ├── main.py              # Point d'entrée FastAPI
│   ├── .env                 # Configuration (ATTENTION: secrets commités)
│   ├── api/
│   │   ├── router.py        # Agrégateur de routes (11 modules)
│   │   └── routes/          # 11 fichiers de routes
│   ├── core/
│   │   ├── config.py        # Settings Pydantic
│   │   ├── database.py      # Engine SQLAlchemy, session, Base
│   │   └── security.py      # JWT, hash passwords, dépendance auth
│   ├── models/              # 22 modèles SQLAlchemy ORM
│   ├── schemas/             # 19 modules Pydantic (validation)
│   ├── services/            # 30+ services métier
│   │   ├── resume_extraction/    # Extraction texte PDF/DOCX
│   │   ├── identity_extraction/  # Extraction identité (13 fichiers)
│   │   ├── skill_extraction/     # Extraction compétences (17 fichiers)
│   │   ├── experience_extraction/ # Extraction expérience
│   │   ├── education_extraction/  # Extraction formation
│   │   ├── certification_extraction/ # Extraction certifications
│   │   ├── language_extraction/   # Extraction langues
│   │   ├── LLM/             # 4 providers LLM (Ollama, DeepSeek, Gemini, OpenAI)
│   │   ├── auth_service.py
│   │   ├── resume_service.py
│   │   ├── evaluation_service.py
│   │   ├── recruitment_service.py
│   │   ├── scoring_engine.py
│   │   ├── notification_service.py
│   │   ├── notification_manager.py  # WebSocket
│   │   ├── job_service.py
│   │   ├── email_service.py
│   │   ├── linkedin_service.py
│   │   └── department_service.py
│   ├── repositories/        # 17 repositories
│   └── utils/               # Traitement images, PDF
├── alembic/                 # 29 migrations
├── scripts/seed_admin.py    # Script admin
└── requirements.txt         # 129 dépendances Python
```

### Frontend (192 fichiers)

```
frontend/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Layout racine (ModalProvider, ToastProvider, SessionProvider)
│   ├── page.tsx             # Redirection → /login
│   ├── globals.css          # Tailwind v4 + polices + animations
│   ├── login/               # Page connexion
│   ├── (protected)/         # Routes protégées (12 pages)
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── evaluations/
│   │   ├── talents/
│   │   ├── recruitments/
│   │   ├── jobs/
│   │   ├── invitations/
│   │   ├── settings/
│   │   ├── profile/
│   │   ├── admin/
│   │   ├── resources/
│   │   └── help/
│   └── not-found.tsx
├── components/              # Composants réutilisables
│   ├── auth/                # LoginForm, SessionProvider
│   ├── layouts/             # Sidebar
│   ├── ui/                  # Toast, NotificationButton, RecentActivities
│   ├── resume/              # Modales import, cartes preview
│   ├── evaluation/          # EvaluatedCandidateCard, EvaluationDetailModal
│   ├── recruitment/         # RecruitmentCard, RecruitmentDetailModal
│   ├── invitation/          # InvitationFormModal
│   ├── jobs/                # JobOfferCard, CreateOfferModal, DetailModal
│   └── user/                # ProfileSection
├── services/                # 11 services API (1 par groupe de routes)
├── stores/                  # 4 stores Zustand (auth, notification, job, toast)
├── hooks/                   # 5 hooks personnalisés (useAuth, useJobs, etc.)
├── lib/                     # Instance Axios, helpers auth, constantes routes
├── types/                   # 9 modules TypeScript (interfaces, types)
├── context/                 # ModalContext
└── proxy.ts                 # Middleware Next.js (Route Guard)
```

---

## 7. Modèle de Données

### Diagramme Relationnel

```
users (id PK, fullname, email, hashed_password, role, avatar, linkedin_id,
       auth_provider, is_active, must_change_password, reset_code,
       reset_code_expires_at, created_at, updated_at)
│
├── resumes (id PK, path, recruiter_id FK→users, created_at)
│
├── invitations (id PK, email, token, expires_at, invited_by FK→users, is_used, created_at)
│
├── notifications (id PK, recruiter_id FK→users, title, message, type, is_read, created_at)
│
├── jobs (id PK, recruiter_id FK→users, type, target, status, message, started_at, completed_at)
│
├── llm_usage (id PK, recruiter_id FK→users, action, model, tokens_prompt,
│              tokens_completion, duration_ms, created_at)
│
├── user_preferences (id PK, user_id FK→users, notification_enabled, ui_language)
│
└── candidats (id PK, fullname, email, phone, photo, resume_id FK→resumes,
               is_talent, talent_date, talent_recruiter_id FK→users, created_at)
    │
    ├── experiences (id PK, title, description, start_date, end_date, candidat_id FK)
    │
    ├── educations (id PK, institution, degree, field_of_study, start_date, end_date, candidat_id FK)
    │
    ├── certifications (id PK, name, organization, issue_date, expiration_date,
    │                   credential_id, credential_url, candidat_id FK)
    │
    ├── skills (via candidat_skills junction table)
    │
    ├── languages (via candidat_languages junction table + proficiency)
    │
    ├── recruitments (id UUID PK, candidate_id FK, job_offer_id FK,
    │                 compatibility_score, status [10 états], priority,
    │                 assigned_recruiter_id, notes, deleted_at, created_at, updated_at)
    │   │
    │   ├── interviews (id UUID PK, recruitment_id FK, title, interview_type,
    │   │               scheduled_at, duration_minutes, location, interviewer_name,
    │   │               status, feedback, rating, created_at)
    │   │
    │   └── recruitment_emails (id UUID PK, recruitment_id FK, email_type,
    │                           sender_email, recipient_email, subject, body,
    │                           status, provider_message_id, created_at)
    │
    └── evaluation_results (candidate_id FK, department_id FK, compatibility,
                            requirements JSON, missing_experiences JSON,
                            candidate_extra_experiences JSON, breakdown JSON)

departments (id PK, name, required_exp_years)
│
├── department_skills (department_id FK, title)
│
└── job_offers (id UUID PK, title, description, responsibilities, department_id FK,
                employment_type, work_mode, seniority_level, status, openings,
                created_at, updated_at)
    │
    └── recruitments (voir ci-dessus)

skills_category (id PK, name)
└── skills (id PK, name, category_id FK)
```

### Résumé des 22 Modèles

| Modèle | Table | Clés Importantes |
|--------|-------|------------------|
| **User** | `users` | fullname, email, role (admin/recruiter/employee), avatar, linkedin_id |
| **Candidat** | `candidats` | fullname, email, phone, photo, is_talent, resume_id (FK) |
| **Resume** | `resumes` | path, recruiter_id (FK) |
| **Experience** | `experiences` | title, description, start_date, end_date, candidat_id (FK) |
| **Education** | `educations` | institution, degree, field_of_study, start/end_date, candidat_id (FK) |
| **Certification** | `certifications` | name, organization, issue/expiration_date, credential_id/url, candidat_id (FK) |
| **Skill** | `skills` | name, category_id (FK→skills_category) |
| **SkillsCategory** | `skills_category` | name |
| **CandidatSkill** | `candidat_skills` | candidat_id (FK) + skill_id (FK) (jonction) |
| **Language** | `languages` | name |
| **CandidatLanguage** | `candidat_languages` | candidat_id + language_id + proficiency (enum) |
| **Department** | `departments` | name, required_exp_years |
| **DepartmentSkill** | `department_skills` | department_id (FK), title (string) |
| **EvaluationResult** | `evaluation_results` | candidate_id (FK), department_id (FK), compatibility (float), requirements (JSON) |
| **JobOffer** | `job_offers` | id (UUID PK), title, description, department_id, employment_type, work_mode, seniority_level, status, openings |
| **Recruitment** | `recruitments` | id (UUID PK), candidate_id, job_offer_id, status (10-state enum), priority, notes, deleted_at (soft delete) |
| **Interview** | `interviews` | id (UUID PK), recruitment_id, title, interview_type, scheduled_at, duration, location, interviewer, status, feedback |
| **RecruitmentEmail** | `recruitment_emails` | id (UUID PK), recruitment_id, email_type, sender, recipient, subject, body, status |
| **Invitation** | `invitations` | email, token, expires_at, invited_by (FK→users), is_used |
| **Notification** | `notifications` | recruiter_id (FK), title, message, type (enum), is_read |
| **Job** (background) | `jobs` | recruiter_id (FK), type (enum), target, status (enum), message |
| **LLMUsage** | `llm_usage` | recruiter_id (FK), action, model, tokens_prompt, tokens_completion, duration_ms |
| **UserPreference** | `user_preferences` | user_id (FK), notification_enabled, ui_language |

---

## 8. Surface d'API

Le backend expose **11 groupes de routes** avec environ **70+ endpoints**.

### Auth (`/api/auth`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/login` | Connexion email/password |
| POST | `/logout` | Déconnexion |
| GET | `/me` | Profil utilisateur courant |
| GET | `/me/stats` | Statistiques utilisateur |
| POST | `/me/avatar` | Upload avatar |
| PUT | `/me/profile` | Mise à jour profil |
| DELETE | `/me` | Suppression compte |
| POST | `/forgot-password` | Demande OTP |
| POST | `/reset-password` | Réinitialisation mot de passe |
| GET | `/linkedin/login` | Redirection LinkedIn OAuth |
| GET | `/linkedin/callback` | Callback LinkedIn OAuth |
| POST | `/invite` | Envoyer invitation (admin) |
| POST | `/accept-invite` | Accepter invitation |
| GET | `/invitations` | Liste invitations |
| DELETE | `/invitations/{id}` | Supprimer invitation |

### Resumes (`/api/resumes`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/upload` | Upload CV |
| GET | `/` | Liste CV |
| GET | `/{id}` | Détail CV |
| DELETE | `/{id}` | Supprimer CV |
| POST | `/analyze` | Analyser CV (pipeline complet) |
| GET | `/{id}/preview` | Aperçu PDF |
| GET | `/{id}/download` | Télécharger CV |
| POST | `/{id}/re-analyze/identity` | Ré-analyser identité |
| POST | `/{id}/re-analyze/skills` | Ré-analyser compétences |
| POST | `/{id}/re-analyze/experiences` | Ré-analyser expériences |
| POST | `/{id}/re-analyze/educations` | Ré-analyser formations |
| POST | `/{id}/re-analyze/languages` | Ré-analyser langues |
| POST | `/{id}/re-analyze/certifications` | Ré-analyser certifications |
| PUT | `/candidat/{id}` | Mettre à jour candidat |
| PUT | `/experience/{id}` | Mettre à jour expérience |
| PUT | `/education/{id}` | Mettre à jour formation |
| PUT | `/certification/{id}` | Mettre à jour certification |

### Evaluate (`/api/evaluate`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/` | Évaluer un candidat |
| GET | `/` | Liste évaluations |
| GET | `/talents` | Liste talents |
| POST | `/talents/toggle` | Marquer/démarquer talent |
| GET | `/department-scores/{candidate_id}` | Scores par département |

### Job Offers (`/api/job-offers`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste offres |
| POST | `/` | Créer offre |
| GET | `/{id}` | Détail offre |
| PUT | `/{id}` | Mettre à jour offre |
| DELETE | `/{id}` | Supprimer offre |
| POST | `/generate` | Générer offre par IA |

### Recruitments (`/api/recruitments`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste recrutements |
| POST | `/` | Créer recrutement |
| GET | `/{id}` | Détail recrutement |
| PUT | `/{id}` | Mettre à jour recrutement |
| DELETE | `/{id}` | Supprimer (soft delete) |
| POST | `/{id}/cancel` | Annuler recrutement |
| POST | `/{id}/interviews` | Créer entretien |
| PUT | `/interviews/{id}` | Mettre à jour entretien |
| DELETE | `/interviews/{id}` | Supprimer entretien |
| POST | `/emails/preview` | Prévisualiser email |
| POST | `/emails/generate` | Générer email par IA |
| POST | `/emails/send` | Envoyer email |

### Notifications (`/api/notifications`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste notifications |
| PUT | `/{id}/read` | Marquer comme lue |
| PUT | `/read-all` | Tout marquer lu |
| DELETE | `/` | Tout supprimer |
| WS | `/ws/notifications/{recruiter_id}` | WebSocket temps réel |

### Jobs (`/api/jobs`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste jobs |
| POST | `/` | Créer job |
| PUT | `/{id}` | Mettre à jour statut |
| DELETE | `/` | Tout supprimer |

### Settings (`/api/settings`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Récupérer préférences |
| PUT | `/` | Mettre à jour préférences |

### Departments (`/api/departments`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste départements |
| POST | `/` | Créer département |
| GET | `/{id}` | Détail département |
| PUT | `/{id}` | Mettre à jour |
| DELETE | `/{id}` | Supprimer |

### Activities (`/api/activities`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Dernières activités |

### Admin (`/api/admin/users`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Liste utilisateurs |
| GET | `/stats` | Statistiques |
| PUT | `/{id}/role` | Mettre à jour rôle |

---

## 9. Points d'Architecture Notables

### 9.1 Pipeline d'Extraction Modulaire

Chaque étape d'extraction (identité, compétences, expérience, etc.) est implémentée comme un pipeline indépendant avec :
- Prétraitement / normalisation
- Extraction par règles (regex, NER spaCy, heuristiques)
- Extraction ML (sentence-transformers embeddings)
- Vérification LLM optionnelle (Strategy Pattern avec 4 providers)
- Scoring / classement des résultats

### 9.2 Providers LLM Interchangeables (Strategy Pattern)

Le système supporte 4 providers LLM interchangeable :

```
LLMService (interface commune)
├── OllamaLLMProvider    → Ollama local (qwen3:8b)
├── DeepSeekLLMProvider  → DeepSeek API
├── GeminiLLMProvider    → Gemini API
└── OpenAILLMProvider    → OpenAI-compatible
```

Chaque service de validation (compétences, identité, expérience, formation, certification, évaluation) utilise le provider configuré via les variables d'environnement.

### 9.3 Soft Delete pour les Recrutements

La table `recruitments` utilise une colonne `deleted_at` (DateTime, nullable) au lieu d'une suppression physique, permettant :
- La récupération des données
- La traçabilité (audit trail)
- L'annulation des opérations

### 9.4 UUID comme Clés Primaires

`job_offers`, `recruitments`, `interviews`, et `recruitment_emails` utilisent des UUID comme clés primaires pour :
- La sécurité (non devinables)
- La génération distribuée
- L'identification unique

### 9.5 Extraction Texte Multi-Strategy

L'extraction de texte utilise une approche multi-stratégie :
1. **PyMuPDF** — rapide et précis (primaire)
2. **pdfplumber** — fallback pour PDF complexes
3. **python-docx** — pour les fichiers DOCX

### 9.6 Traitements Asynchrones (BackgroundTasks)

Les opérations longues (analyse de CV, extraction) utilisent `BackgroundTasks` de FastAPI pour ne pas bloquer la réponse HTTP.

### 9.7 WebSocket Notifications (Pub/Sub)

Les notifications temps réel utilisent un `NotificationConnectionManager` (singleton) qui maintient les connexions WebSocket par utilisateur avec `asyncio.Lock` pour la thread-safety.

### 9.8 Authentification Duale (Cookie + localStorage)

Les tokens JWT sont stockés à la fois :
- En cookie `httpOnly` (pour le middleware Next.js)
- En localStorage (pour les appels Axios côté client)

### 9.9 Moteur de Scoring Pondéré

Le `scoring_engine.py` implémente un scoring modulaire et pondéré :

```python
weights = {
    "skills": 0.40,
    "experience": 0.25,
    "education": 0.15,
    "certifications": 0.05,
    "languages": 0.05,
    "preferred_skills": 0.10
}
```

### 9.10 Support Multilingue

- L'interface utilisateur est bilingue Français/Anglais
- La génération d'emails supporte plusieurs langues via LLM
- La majorité du texte UI est en Français

---

## 10. Chronologie du Développement

| Phase | Période | Commits | Activités Principales |
|-------|---------|---------|----------------------|
| **Initialisation** | 7-8 mai | 3 | Structure backend/frontend, diagrammes UML |
| **Base extraction** | 20-22 mai | 40 | Pipeline extraction texte, identité, compétences |
| **Base de données** | 1-4 juin | 57 | Modèles SQLAlchemy, migrations, résumé storage |
| **Extraction avancée** | 7-13 juin | 53 | Expérience, formations, certifications, langues |
| **Authentification** | 14-22 juin | 50 | JWT, login, invitations, OAuth LinkedIn |
| **Phase intensive frontend** | 24-30 juin | 80 | Dashboard, documents, évaluations, composants UI |
| **Recrutement** | 1-7 juillet | 120 | Offres emploi, workflow, entretiens, emails IA |
| **Notifications + Jobs** | 8-10 juillet | 34 | WebSocket, jobs background, settings |
| **Finalisation** | 11-15 juillet | 36 | Admin, aide, réglages, correctifs |

**Répartition des commits par jour :**

```
Mai ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  43 commits
Juin ██████████████████████████████░░░░░░░░░░░░░░░░ 150 commits
Juillet ██████████████████████████████████████████░░ 200+ commits
```

---

## 11. Analyse Critique

### 11.1 Points Forts

| Aspect | Évaluation |
|--------|------------|
| **Architecture** | Bien structurée, modulaire, séparation des responsabilités claire (Repository + Service + Pipeline) |
| **Backend** | ~95% complet — tous les pipelines d'extraction, 22 modèles, 17 repositories, 30+ services |
| **Frontend** | ~90% complet — 14 pages, cycle de recrutement complet, notifications temps réel |
| **IA/ML** | Excellent — pipeline multi-stratégie (règles + ML + LLM) |
| **Qualité du code** | Bonne — patterns cohérents, type hints Python, TypeScript strict |

### 11.2 Points de Vigilance

| Aspect | Problème | Sévérité |
|--------|----------|----------|
| **Sécurité** | Secrets en clair dans `.env` versionné (mot de passe Gmail, JWT secret, DB password, API keys) | **Critique** |
| **Sécurité** | CORS `allow_origins=["*"]` en production | **Critique** |
| **Tests** | 1 seul fichier de test pour ~300 fichiers source | **Élevée** |
| **CI/CD** | Aucun pipeline CI/CD, pas de Docker | **Moyenne** |
| **Paginations** | Absente sur `/api/resumes/` | **Moyenne** |
| **Configuration** | Pas de configuration par environnement (dev/staging/prod) | **Moyenne** |
| **Frontend** | Pas de Error Boundaries sur les pages | **Faible** |
| **Dépendances** | Dépendances ML lourdes (~15 Go installés) | **Faible** |

### 11.3 Recommandations

1. **Sécurité** : Externaliser les secrets (variables d'environnement, vault), restreindre CORS
2. **Tests** : Ajouter des tests unitaires et d'intégration (pytest)
3. **CI/CD** : Dockeriser l'application, ajouter GitHub Actions
4. **Monitoring** : Ajouter du logging structuré et des métriques
5. **Performance** : Paginer les endpoints REST, optimiser les requêtes DB
6. **Documentation** : Générer une documentation API (Swagger/OpenAPI déjà disponible via FastAPI)

---

## Annexe : Diagrammes UML (Conception)

Des diagrammes de conception sont disponibles au format PDF dans le dossier `Conception UML/` :

| Diagramme | Fichier | Description |
|-----------|---------|-------------|
| Cas d'utilisation | `use-case-diagram.pdf` | Acteurs et cas d'utilisation du système |
| Diagramme de classes | `UML-class-diagram.pdf` | Modèle de données et relations entre entités |
| Diagramme de flux | `data-flow-diagram.pdf` | Flux de données à travers le système |
