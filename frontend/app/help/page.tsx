"use client";

import React, { useState, useMemo } from "react";
import { BookOpen, ChevronRight, Search } from "lucide-react";
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftHelpIcon } from "@/components/layouts/AtlasoftIcons";
import { useLanguage } from "@/context/LanguageContext";

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = escapeRegExp(query.trim());
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  const lowerQuery = query.trim().toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lowerQuery ? (
          <mark key={i} className="bg-yellow-500 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function highlightTree(node: React.ReactNode, query: string): React.ReactNode {
  if (!query.trim()) return node;
  if (typeof node === "string") {
    return <HighlightText text={node} query={query} />;
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    const children = node.props.children;
    if (children !== undefined && children !== null) {
      return React.cloneElement(node, {
        ...node.props,
        children: React.Children.map(children, (child: React.ReactNode) =>
          highlightTree(child, query)
        ),
      });
    }
    return node;
  }
  return node;
}

interface DocSection {
  id: string;
  label: string;
}

function HelpContent({ section, searchQuery }: { section: string; searchQuery: string }) {
  switch (section) {
    case "dashboard":
      return <DashboardDoc searchQuery={searchQuery} />;
    case "talents":
      return <TalentsDoc searchQuery={searchQuery} />;
    case "evaluations":
      return <EvaluationsDoc searchQuery={searchQuery} />;
    case "departements":
      return <DepartementsDoc searchQuery={searchQuery} />;
    case "documents":
      return <DocumentsDoc searchQuery={searchQuery} />;
    case "jobs":
      return <JobsDoc searchQuery={searchQuery} />;
    case "recruitments":
      return <RecruitmentsDoc searchQuery={searchQuery} />;
    case "invitations":
      return <InvitationsDoc searchQuery={searchQuery} />;
    case "profile":
      return <ProfileDoc searchQuery={searchQuery} />;
    case "settings":
      return <SettingsDoc searchQuery={searchQuery} />;
    case "connexion":
      return <ConnexionDoc searchQuery={searchQuery} />;
    case "admin":
      return <AdminDoc searchQuery={searchQuery} />;
    case "features":
      return <FeaturesDoc searchQuery={searchQuery} />;
    default:
      return <DashboardDoc searchQuery={searchQuery} />;
  }
}

function DocHeader({ title, description, searchQuery }: { title: string; description: string; searchQuery: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-[#f3f2f1]">
        <HighlightText text={title} query={searchQuery} />
      </h2>
      <p className="text-sm text-slate-500 dark:text-[#a19f9d] mt-1">
        <HighlightText text={description} query={searchQuery} />
      </p>
    </div>
  );
}

function DashboardDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Tableau de bord", "Dashboard")}
        description={l("Page d'accueil de TalentFlow", "TalentFlow home page")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "Le tableau de bord est la première page que vous voyez après connexion. Il sert de hub central pour accéder rapidement aux différentes sections de l'application.",
            "The dashboard is the first page you see after signing in. It serves as a central hub for quick access to each section of the application."
          )}
        </Section>
        <Section title={l("Cartes d'accès rapide", "Quick access cards")} searchQuery={searchQuery}>
          {l(
            "Chaque carte représente une section clé de l'application. Passez la souris sur une carte pour voir les détails et cliquez sur le bouton pour accéder directement à la section.",
            "Each card represents a core section of the application. Hover over a card for details and click it to jump directly to that section."
          )}
        </Section>
        <Section title={l("Sections disponibles", "Available sections")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>{l("Gestion des talents", "Talent management")}</strong> —{" "}
              {l("Consulter et gérer les profils talents", "View and manage talent profiles")}
            </li>
            <li>
              <strong>{l("Analyse & Statistiques", "Analytics & Statistics")}</strong> —{" "}
              {l("Suivre les indicateurs clés de recrutement", "Track key recruitment metrics")}
            </li>
            <li>
              <strong>{l("Documents & Ressources", "Documents & Resources")}</strong> —{" "}
              {l("Centraliser les CV et rapports d'évaluation", "Centralize resumes and evaluation reports")}
            </li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function DepartementsDoc({ searchQuery }: { searchQuery: string }) {
  const { language, l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Départements", "Departments")}
        description={l("Gestion des départements de l'entreprise", "Company department management")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page Départements vous permet de structurer votre organisation en créant et gérant les départements de votre entreprise, chacun avec ses propres exigences.",
            "The Departments page lets you structure your organization by creating and managing company departments, each with its own requirements."
          )}
        </Section>
        <Section title={l("Fonctionnalités", "Features")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Recherche", "Search")}</strong> — {l("Filtrez les départements par nom", "Filter departments by name")}</li>
            <li><strong>{l("Tri", "Sorting")}</strong> — {l("Triez par nom ou par date de création", "Sort by name or creation date")}</li>
            <li><strong>{l("Création", "Creation")}</strong> — {l("Ajoutez un nouveau département avec son nom, années d'expérience requises et compétences", "Add a new department with its name, required years of experience, and skills")}</li>
            <li><strong>{l("Modification", "Editing")}</strong> — {l("Éditez un département existant en un clic", "Edit an existing department in one click")}</li>
            <li><strong>{l("Suppression", "Deletion")}</strong> — {l("Supprimez un département avec confirmation", "Delete a department with confirmation")}</li>
            <li><strong>{l("Pagination", "Pagination")}</strong> — {l("Navigation paginée (8 éléments par page)", "Paginated navigation (8 items per page)")}</li>
            <li><strong>{l("Détails", "Details")}</strong> — {l("Cliquez sur une ligne pour voir tous les détails dans un modal", "Click a row to inspect full details in a modal")}</li>
          </ul>
        </Section>
        <Section title={l("Compétences requises", "Required skills")} searchQuery={searchQuery}>
          {language === "en" ? (
            <>
              Skills are entered as text separated by the{" "}
              <code className="bg-slate-100 dark:bg-[#323130] dark:text-[#f3f2f1] px-1 rounded">+</code>{" "}
              symbol. In the table, only the first 3 skills are displayed for readability.
            </>
          ) : (
            <>
              Les compétences sont saisies sous forme de texte séparé par le symbole{" "}
              <code className="bg-slate-100 dark:bg-[#323130] dark:text-[#f3f2f1] px-1 rounded">+</code>.
              Dans le tableau, seules les 3 premières compétences sont affichées pour une meilleure lisibilité.
            </>
          )}
        </Section>
      </div>
    </article>
  );
}

function DocumentsDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Documents", "Documents")}
        description={l("Centralisation et gestion des CV et documents", "Centralization and management of resumes and documents")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page Documents vous permet d'importer, consulter et gérer tous les CV et documents liés aux candidatures et aux talents.",
            "The Documents page lets you upload, preview, and manage all resumes and candidate documents."
          )}
        </Section>
        <Section title={l("Fonctionnalités", "Features")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Import de CV", "Resume upload")}</strong> — {l("Importez un fichier PDF pour analyse automatique", "Upload a PDF file for automatic parsing and analysis")}</li>
            <li><strong>{l("Recherche", "Search")}</strong> — {l("Filtrez les documents par nom ou contenu", "Filter documents by name or content")}</li>
            <li><strong>{l("Prévisualisation", "Preview")}</strong> — {l("Visualisez le contenu du CV directement dans l'interface", "View the resume directly inside the interface")}</li>
            <li><strong>{l("Informations extraites", "Extracted data")}</strong> — {l("Consultez les données extraites automatiquement (nom, email, compétences, etc.)", "Inspect automatically extracted data (name, email, skills, etc.)")}</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function InvitationsDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Invitations", "Invitations")}
        description={l("Gestion des invitations des recruteurs", "Recruiter invitation management")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page Invitations vous permet d'inviter des recruteurs à rejoindre votre espace de travail et de suivre le statut de chaque invitation envoyée.",
            "The Invitations page allows you to invite recruiters to join your workspace and track the status of every sent invitation."
          )}
        </Section>
        <Section title={l("Fonctionnalités", "Features")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Inviter", "Invite")}</strong> — {l("Envoyez une invitation par email à un nouveau recruteur", "Send an email invitation to a new recruiter")}</li>
            <li><strong>{l("Statuts", "Statuses")}</strong> — {l("Suivez les invitations (En attente, Acceptée, Expirée)", "Track invitations (Pending, Accepted, Expired)")}</li>
            <li><strong>{l("Filtres", "Filters")}</strong> — {l("Filtrez par statut ou recherchez par email", "Filter by status or search by email")}</li>
            <li><strong>{l("Détails", "Details")}</strong> — {l("Cliquez sur une invitation pour voir tous les détails", "Click any invitation to view all details")}</li>
            <li><strong>{l("Actions", "Actions")}</strong> — {l("Renvoyez, copiez le lien ou révoquez une invitation depuis le modal de détails", "Resend, copy the link, or revoke an invitation from the details modal")}</li>
          </ul>
        </Section>
        <Section title={l("Statuts des invitations", "Invitation statuses")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("En attente", "Pending")}</strong> — {l("L'invitation a été envoyée mais pas encore acceptée", "The invitation has been sent but not yet accepted")}</li>
            <li><strong>{l("Acceptée", "Accepted")}</strong> — {l("Le recruteur a rejoint l'espace de travail", "The recruiter has joined the workspace")}</li>
            <li><strong>{l("Expirée", "Expired")}</strong> — {l("Le délai de validité est dépassé", "The validity period has passed")}</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function ProfileDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Profil", "Profile")}
        description={l("Gestion de votre compte utilisateur", "Manage your user account")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page Profil vous permet de consulter et modifier les informations de votre compte, de gérer votre photo de profil, de changer votre mot de passe et de consulter vos statistiques d'activité.",
            "The Profile page lets you review and update your account details, manage your profile photo, change your password, and monitor activity metrics."
          )}
        </Section>
        <Section title={l("Fonctionnalités", "Features")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Photo de profil", "Profile picture")}</strong> — {l("Modifiez votre avatar depuis l'interface", "Update your avatar directly in the UI")}</li>
            <li><strong>{l("Informations personnelles", "Personal info")}</strong> — {l("Modifiez votre nom complet et votre adresse email", "Edit your full name and email address")}</li>
            <li><strong>{l("Mot de passe", "Password")}</strong> — {l("Changez votre mot de passe (obligatoire à la première connexion)", "Change your password (required on first login)")}</li>
            <li><strong>{l("Activités et statistiques", "Activity & stats")}</strong> — {l("Consultez le nombre de CV analysés, les requêtes LLM par action et les statistiques d'invitations (administrateurs uniquement)", "View analyzed resumes count, LLM requests by action, and invitation metrics (admins only)")}</li>
            <li><strong>{l("Informations du compte", "Account details")}</strong> — {l("Consultez votre rôle, date d'inscription, statut de vérification et méthode d'authentification", "Check your role, signup date, verification status, and authentication provider")}</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function SettingsDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Paramètres", "Settings")}
        description={l("Configuration de votre espace de travail", "Workspace configuration")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page Paramètres regroupe la configuration de vos préférences d'apparence et de langue, vos notifications, les options de sécurité et la gestion de votre compte.",
            "The Settings page centralizes your appearance and language preferences, notifications, security options, and account management."
          )}
        </Section>
        <Section title={l("Onglets disponibles", "Available tabs")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Notifications", "Notifications")}</strong> — {l("Activez ou désactivez les notifications par email pour chaque type d'événement (nouveau candidat, invitation acceptée, mises à jour système)", "Enable or disable email notifications for each event type (new candidate, accepted invitation, system updates)")}</li>
            <li><strong>{l("Apparence & Langue", "Appearance & Language")}</strong> — {l("Basculez entre le mode clair et le mode sombre, et choisissez la langue de l'interface (Français / English)", "Switch between light and dark themes, and choose the interface language (Français / English)")}</li>
            <li><strong>{l("Sécurité", "Security")}</strong> — {l("Modifiez votre mot de passe, consultez les détails de votre compte (rôle, statut, email vérifié) et accédez à la zone dangereuse", "Change your password, review account security details (role, status, verified email), and access the danger zone")}</li>
          </ul>
        </Section>
        <Section title={l("Zone dangereuse", "Danger zone")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Déconnexion", "Sign out")}</strong> — {l("Déconnectez-vous de votre session", "Sign out of your active session")}</li>
            <li><strong>{l("Suppression du compte", "Delete account")}</strong> — {l("Supprimez définitivement votre compte et toutes vos données (CV, évaluations, talents, recrutements). Une confirmation par texte est requise avant suppression.", "Permanently delete your account and all your data (resumes, evaluations, talents, recruitments). Text confirmation is required before deletion.")}</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function JobsDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Offres d'emploi", "Job offers")}
        description={l("Gestion des offres d'emploi générées par l'IA", "Management of AI-generated job offers")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page Offres d'emploi vous permet de créer, consulter et gérer les offres d'emploi de votre entreprise. Les offres peuvent être générées automatiquement par l'IA à partir d'une simple description.",
            "The Job Offers page lets you create, view, and manage your company's open roles. Job listings can be automatically generated by AI from a brief description."
          )}
        </Section>
        <Section title={l("Fonctionnalités", "Features")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Génération IA", "AI generation")}</strong> — {l("Créez une offre d'emploi automatiquement à partir d'une description textuelle", "Automatically generate a structured job offer from a text prompt")}</li>
            <li><strong>{l("Recherche", "Search")}</strong> — {l("Filtrez les offres par titre, type de contrat ou mode de travail", "Filter offers by title, contract type, or work mode")}</li>
            <li><strong>{l("Pagination", "Pagination")}</strong> — {l("Navigation paginée (8 éléments par page)", "Paginated browsing (8 items per page)")}</li>
            <li><strong>{l("Consultation", "Inspection")}</strong> — {l("Visualisez les détails complets d'une offre (titre, département, salaire, etc.)", "View full job details (title, department, salary, etc.)")}</li>
            <li><strong>{l("Modification", "Editing")}</strong> — {l("Éditez une offre existante", "Update an existing job offer")}</li>
            <li><strong>{l("Suppression", "Deletion")}</strong> — {l("Supprimez une offre avec confirmation", "Delete an offer with confirmation")}</li>
          </ul>
        </Section>
        <Section title={l("Informations disponibles", "Available details")} searchQuery={searchQuery}>
          {l(
            "Chaque offre d'emploi affiche le titre, le département concerné, le type de contrat, le mode de travail, le niveau de séniorité, la fourchette de salaire et le statut de l'offre.",
            "Each job offer shows its title, target department, contract type, work mode, seniority level, salary range, and publication status."
          )}
        </Section>
      </div>
    </article>
  );
}

function RecruitmentsDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Recrutements", "Recruitments")}
        description={l("Suivi du pipeline de recrutement des talents", "Talent recruitment pipeline tracking")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page Recrutements vous permet de suivre l'ensemble du pipeline de recrutement des candidats désignés comme talents, depuis la mise en relation jusqu'à la décision finale.",
            "The Recruitments page lets you track the complete hiring pipeline for designated talents, from initial outreach through the final hiring decision."
          )}
        </Section>
        <Section title={l("Fonctionnalités", "Features")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Liste des recrutements", "Recruitment list")}</strong> — {l("Visualisez tous les recrutements en cours sous forme de cartes", "Browse all active recruitment processes as cards")}</li>
            <li><strong>{l("Recherche", "Search")}</strong> — {l("Filtrez par nom du candidat ou intitulé du poste", "Filter by candidate name or job title")}</li>
            <li><strong>{l("Filtres", "Filters")}</strong> — {l("Filtrez par statut et priorité via un panneau dédié", "Filter by status and priority from the filter panel")}</li>
            <li><strong>{l("Pagination", "Pagination")}</strong> — {l("Navigation paginée (12 éléments par page)", "Paginated browsing (12 items per page)")}</li>
            <li><strong>{l("Détails", "Details")}</strong> — {l("Consultez les informations complètes du recrutement dans un modal à trois onglets (Informations, Entretien, Email)", "Inspect full recruitment info inside a 3-tab modal (Information, Interview, Email)")}</li>
            <li><strong>{l("Score du département", "Department score")}</strong> — {l("Le score du département associé au poste apparaît dans l'en-tête du modal", "The job's matching department score appears in the modal header")}</li>
            <li><strong>{l("Notes modifiables", "Editable notes")}</strong> — {l("Ajoutez ou modifiez les notes directement depuis le modal de détails", "Add or edit notes directly inside the details modal")}</li>
            <li><strong>{l("Annulation", "Cancellation")}</strong> — {l("Annulez un recrutement depuis le modal (uniquement pour les recrutements en attente). Les entretiens et emails associés sont supprimés automatiquement", "Cancel a recruitment from the modal (pending recruitments only). Linked interviews and emails are removed automatically")}</li>
          </ul>
        </Section>
        <Section title={l("Onglet Entretien", "Interview tab")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Planifiez un entretien avec date, heure, durée, lieu et nom de l'intervieweur", "Schedule an interview with date, time, duration, location, and interviewer name")}</li>
            <li>{l("Consultez la liste des entretiens déjà planifiés avec leur statut", "View scheduled interviews along with their current status")}</li>
          </ul>
        </Section>
        <Section title={l("Onglet Email", "Email tab")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Choisissez un entretien planifié existant pour pré-remplir automatiquement la date, l'heure, la durée et le lieu", "Select an existing scheduled interview to auto-fill date, time, duration, and location")}</li>
            <li>{l("Saisissez le nom de l'entreprise et la langue souhaitée", "Enter your company name and desired language")}</li>
            <li>{l("Générez un email d'invitation professionnel via l'IA (DeepSeek)", "Generate a professional invitation email using AI (DeepSeek)")}</li>
            <li>{l("Modifiez le sujet et le corps HTML avant envoi", "Edit the subject and HTML body before sending")}</li>
            <li>{l("Consultez l'historique des emails envoyés", "Review previously sent email history")}</li>
          </ul>
        </Section>
        <Section title={l("Statuts de recrutement", "Recruitment statuses")} searchQuery={searchQuery}>
          {l(
            "Les recrutements peuvent avoir différents statuts : en attente, invitation envoyée, entretien confirmé, entretien terminé, offre envoyée, acceptée, refusée, candidat décliné, embauché ou annulé. Chaque statut est représenté par une couleur distinctive.",
            "Recruitments track distinct stages: pending, invitation sent, interview confirmed, interview completed, offer sent, accepted, rejected, candidate declined, hired, or cancelled. Each status uses a distinct color badge."
          )}
        </Section>
      </div>
    </article>
  );
}

function AdminDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Administration", "Administration")}
        description={l("Gestion des utilisateurs de la plateforme", "Platform user management")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page Administration est accessible uniquement aux administrateurs. Elle permet de consulter la liste de tous les utilisateurs de la plateforme et leurs statistiques d'utilisation.",
            "The Administration page is restricted to administrators. It displays all platform users along with their usage metrics."
          )}
        </Section>
        <Section title={l("Fonctionnalités", "Features")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Liste des utilisateurs", "User directory")}</strong> — {l("Visualisez tous les comptes recruteurs de la plateforme", "View all recruiter accounts across the platform")}</li>
            <li><strong>{l("Recherche", "Search")}</strong> — {l("Filtrez les utilisateurs par nom ou email", "Filter users by name or email")}</li>
            <li><strong>{l("Statistiques", "Metrics")}</strong> — {l("Consultez le nombre de CV analysés et de requêtes LLM par utilisateur", "Track parsed resumes and LLM requests per user")}</li>
            <li><strong>{l("Actualisation", "Refresh")}</strong> — {l("Rafraîchissez la liste pour voir les données à jour", "Refresh the list for live usage data")}</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function FeaturesDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Fonctionnalités implémentées", "Implemented features")}
        description={l("Liste complète des fonctionnalités disponibles", "Complete list of available capabilities")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Authentification et comptes", "Authentication & accounts")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Page de connexion sécurisée avec email et mot de passe", "Secure sign-in page with email and password")}</li>
            <li>{l("Protection des routes par authentification", "Default-deny route protection via authentication")}</li>
            <li>{l("Gestion de session avec stockage côté client (SessionProvider)", "Client session management (SessionProvider)")}</li>
            <li>{l("Page de modification du profil utilisateur", "User profile editing page")}</li>
            <li>{l("Photo de profil modifiable avec aperçu", "Editable profile photo with live preview")}</li>
            <li>{l("Informations personnelles éditables (nom, email)", "Editable personal info (name, email)")}</li>
            <li>{l("Changement de mot de passe avec confirmation", "Password change with confirmation")}</li>
            <li>{l("Bannière de changement de mot de passe obligatoire à la première connexion", "Mandatory password change banner on first login")}</li>
            <li>{l("Page d'acceptation d'invitation avec création de compte", "Invitation acceptance page with account creation")}</li>
            <li>{l("Déconnexion sécurisée", "Secure sign-out")}</li>
            <li>{l("Authentification via LinkedIn", "LinkedIn authentication")}</li>
          </ul>
        </Section>

        <Section title={l("Profil et statistiques", "Profile & statistics")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Photo de profil avec téléchargement, aperçu et annulation", "Profile picture upload, preview, and cancel")}</li>
            <li>{l("Édition en ligne du nom et de l'email", "Inline editing for name and email")}</li>
            <li>{l("Changement de mot de passe avec validation", "Validated password updates")}</li>
            <li>{l("Statistiques d'activité : nombre de CV analysés", "Activity stats: analyzed resumes count")}</li>
            <li>{l("Tableau des requêtes LLM par action avec total", "LLM requests breakdown table by action with total")}</li>
            <li>{l("Statistiques d'invitations (administrateurs uniquement)", "Invitation statistics (admins only)")}</li>
            <li>{l("Informations du compte : rôle, statut, authentification, date d'inscription", "Account info: role, status, provider, registration date")}</li>
          </ul>
        </Section>

        <Section title={l("Talents", "Talents")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Affichage des talents sous forme de cartes en grille", "Grid card view of designated talents")}</li>
            <li>{l("Score du candidat pour son meilleur département", "Candidate score for top matching department")}</li>
            <li>{l("Date de désignation et nom du recruteur", "Designation date and recruiter name")}</li>
            <li>{l("Photo du candidat ou avatar par défaut", "Candidate photo or fallback avatar")}</li>
            <li>{l("Mise à jour automatique depuis les évaluations", "Automatic sync from candidate evaluations")}</li>
            <li>{l("Modal de détails avec compétences et expériences", "Details modal with skills and experience")}</li>
            <li>{l("Action de recrutement depuis le profil talent", "Initiate recruitment directly from talent profile")}</li>
            <li>{l("Retrait d'un talent avec confirmation", "Remove talent status with confirmation")}</li>
          </ul>
        </Section>

        <Section title={l("Évaluations", "Evaluations")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Liste des candidats évalués par l'IA sous forme de cartes", "Card list of AI-evaluated candidates")}</li>
            <li>{l("Aperçu des compétences, expérience et langues", "Overview of skills, experience, and languages")}</li>
            <li>{l("Modal de détails avec compatibilité par département", "Details modal with per-department match breakdown")}</li>
            <li>{l("Affichage des exigences remplies et manquantes", "Display of met and missing requirements")}</li>
            <li>{l("Expériences supplémentaires du candidat", "Additional candidate experiences")}</li>
            <li>{l("Désignation d'un candidat comme talent", "Designate a candidate as talent")}</li>
            <li>{l("Validation LLM des évaluations générées", "LLM validation of generated evaluations")}</li>
          </ul>
        </Section>

        <Section title={l("Départements", "Departments")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Liste paginée des départements (8 par page)", "Paginated department list (8 per page)")}</li>
            <li>{l("Recherche par nom", "Search by name")}</li>
            <li>{l("Tri par nom ou date de création", "Sort by name or creation date")}</li>
            <li>{l("Création d'un département avec expérience et compétences requises", "Create departments with required experience and skills")}</li>
            <li>{l("Modification d'un département", "Edit departments")}</li>
            <li>{l("Suppression avec confirmation", "Delete with confirmation")}</li>
            <li>{l("Affichage limité à 3 compétences dans le tableau avec indicateur \"+N\"", "Table capped at 3 skills with \"+N\" indicator")}</li>
            <li>{l("Modal de détails au clic sur une ligne", "Row click details modal")}</li>
          </ul>
        </Section>

        <Section title={l("Documents et CV", "Documents & Resumes")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Import de CV au format PDF", "PDF resume upload")}</li>
            <li>{l("Analyse automatique des documents (extraction d'identité, compétences, expériences, formations, certifications, langues)", "Automatic document parsing (identity, skills, work history, education, certifications, languages)")}</li>
            <li>{l("Extraction des informations depuis le CV", "Structured extraction from resumes")}</li>
            <li>{l("Prévisualisation des documents", "Document preview")}</li>
            <li>{l("Recherche dans les documents", "Search across documents")}</li>
            <li>{l("Progression de l'import avec étapes visuelles (multi-étape)", "Multi-step visual import progress")}</li>
            <li>{l("Gestion des erreurs d'import", "Import error handling")}</li>
            <li>{l("Pagination (8 éléments par page)", "Pagination (8 items per page)")}</li>
            <li>{l("Suppression de document avec confirmation", "Document deletion with confirmation")}</li>
          </ul>
        </Section>

        <Section title={l("Offres d'emploi", "Job offers")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Génération d'offres d'emploi par IA à partir d'une description", "AI job description generation from a text prompt")}</li>
            <li>{l("Liste des offres en grille avec recherche et pagination", "Grid listing with search and pagination")}</li>
            <li>{l("Consultation détaillée d'une offre (titre, département, contrat, salaire, séniorité)", "Detailed offer view (title, department, contract, salary, seniority)")}</li>
            <li>{l("Modification et suppression d'offres", "Offer editing and deletion")}</li>
            <li>{l("Filtres par type de contrat et mode de travail", "Filters by contract type and work mode")}</li>
          </ul>
        </Section>

        <Section title={l("Recrutements", "Recruitments")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Pipeline de recrutement des talents sous forme de cartes", "Card-based talent recruitment pipeline")}</li>
            <li>{l("Recherche par nom du candidat ou intitulé du poste", "Search by candidate name or job title")}</li>
            <li>{l("Filtres par statut et priorité", "Filter by status and priority")}</li>
            <li>{l("Pagination (12 éléments par page)", "Pagination (12 items per page)")}</li>
            <li>{l("Modal de détails à trois onglets (Informations, Entretien, Email)", "Three-tab details modal (Information, Interview, Email)")}</li>
            <li>{l("Affichage du score du département dans l'en-tête du modal", "Department score displayed in modal header")}</li>
            <li>{l("Notes modifiables directement dans le modal", "Notes editable directly inside modal")}</li>
            <li>{l("Sélection d'un entretien planifié pour générer un email", "Select a scheduled interview to generate an email")}</li>
            <li>{l("Génération d'email d'invitation par IA (DeepSeek) avec choix de langue", "AI interview invite email generation (DeepSeek) with language selector")}</li>
            <li>{l("Annulation d'un recrutement avec suppression des entretiens et emails associés", "Recruitment cancellation with automatic cleanup of linked interviews and emails")}</li>
            <li>{l("Statuts : en attente, invitation envoyée, entretien confirmé, entretien terminé, offre envoyée, acceptée, refusée, candidat décliné, embauché, annulé", "Statuses: pending, invitation sent, interview confirmed, interview completed, offer sent, accepted, rejected, candidate declined, hired, cancelled")}</li>
          </ul>
        </Section>

        <Section title={l("Invitations", "Invitations")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Invitation de recruteurs par email", "Invite recruiters by email")}</li>
            <li>{l("Suivi des statuts (en attente, acceptée, expirée)", "Status tracking (pending, accepted, expired)")}</li>
            <li>{l("Filtrage par statut et recherche par email", "Status filtering and email search")}</li>
            <li>{l("Tri par date ou email", "Sort by date or email")}</li>
            <li>{l("Modal de détails avec actions (renvoyer, copier le lien, révoquer, supprimer)", "Details modal with actions (resend, copy link, revoke, delete)")}</li>
            <li>{l("Barre de métriques (en attente, acceptées, expirées, total)", "Metrics bar (pending, accepted, expired, total)")}</li>
            <li>{l("Page d'acceptation d'invitation publique", "Public invitation acceptance page")}</li>
          </ul>
        </Section>

        <Section title={l("Administration", "Administration")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Liste des utilisateurs de la plateforme (administrateurs uniquement)", "Platform user list (administrators only)")}</li>
            <li>{l("Recherche par nom ou email", "Search by name or email")}</li>
            <li>{l("Statistiques par utilisateur : nombre de CV analysés et requêtes LLM", "Per-user metrics: parsed resumes and LLM requests")}</li>
            <li>{l("Actualisation des données en temps réel", "Live data refresh")}</li>
          </ul>
        </Section>

        <Section title={l("Paramètres et sécurité", "Settings & security")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Gestion des préférences de notification par email (nouveau candidat, invitation acceptée, mises à jour)", "Email notification preferences (new candidate, accepted invitation, updates)")}</li>
            <li>{l("Préférences d'apparence (mode clair / mode sombre) et langue (Français / English)", "Appearance preferences (light / dark mode) and language (Français / English)")}</li>
            <li>{l("Modification du mot de passe avec confirmation", "Password updates with confirmation")}</li>
            <li>{l("Informations de sécurité du compte (rôle, statut, email vérifié, date d'inscription)", "Account security info (role, status, email verified, signup date)")}</li>
            <li>{l("Déconnexion de la session", "Session sign-out")}</li>
            <li>{l("Suppression du compte avec confirmation par texte obligatoire", "Account deletion with mandatory confirmation phrase")}</li>
          </ul>
        </Section>

        <Section title={l("Interface et navigation", "Interface & navigation")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{l("Barre latérale de navigation responsive", "Responsive navigation sidebar")}</li>
            <li>{l("Indicateur de page active", "Active page indicator")}</li>
            <li>{l("Mode mobile avec menu hamburger", "Mobile drawer menu")}</li>
            <li>{l("Notifications en temps réel (toasts) avec indicateur de notification", "Real-time notifications (toasts) with unread indicator")}</li>
            <li>{l("Feed d'activités récentes sur le tableau de bord", "Recent activity feed on dashboard")}</li>
            <li>{l("Indicateur de progression des tâches système (SystemJobs)", "System background task progress indicator")}</li>
            <li>{l("Design épuré et cohérent", "Clean and consistent design")}</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function TalentsDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Talents", "Talents")}
        description={l("Candidats désignés comme talents par les recruteurs", "Candidates designated as talents by recruiters")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page Talents affiche les candidats que les recruteurs ont désignés comme talents. Chaque talent est présenté sous forme de carte avec ses informations clés et son score.",
            "The Talents page showcases candidates marked as talents by recruiters. Each talent appears as a summary card with key profile details and top match score."
          )}
        </Section>
        <Section title={l("Cartes talent", "Talent cards")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Photo", "Photo")}</strong> — {l("Photo du candidat ou avatar par défaut", "Candidate photo or default avatar")}</li>
            <li><strong>{l("Score", "Score")}</strong> — {l("Score le plus élevé obtenu par le candidat", "Highest department match score achieved")}</li>
            <li><strong>{l("Département", "Department")}</strong> — {l("Meilleur département correspondant au profil", "Best-matching department for the profile")}</li>
            <li><strong>{l("Talent depuis", "Talent since")}</strong> — {l("Date de désignation en tant que talent", "Date when talent status was granted")}</li>
            <li><strong>{l("Défini par", "Set by")}</strong> — {l("Nom du recruteur ayant désigné le talent", "Name of the recruiter who designated the talent")}</li>
          </ul>
        </Section>
        <Section title={l("Statut talent", "Talent status")} searchQuery={searchQuery}>
          {l(
            "Le statut de talent est attribué depuis la page Évaluations. Après avoir consulté les résultats détaillés de l'évaluation d'un candidat, vous pouvez décider de le désigner comme talent. Les talents apparaissent automatiquement dans cette page.",
            "Talent status is assigned from the Evaluations page. After reviewing a candidate's evaluation breakdown, you can designate them as a talent so they appear automatically here."
          )}
        </Section>
      </div>
    </article>
  );
}

function EvaluationsDoc({ searchQuery }: { searchQuery: string }) {
  const { language, l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Évaluations", "Evaluations")}
        description={l("Consultation des candidats évalués par l'intelligence artificielle", "Review AI-evaluated candidates")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page Évaluations liste les candidats dont le CV a été analysé par l'intelligence artificielle. Chaque candidat est présenté sous forme de carte avec un aperçu de son profil.",
            "The Evaluations page lists candidates whose resumes have been analyzed by AI. Each candidate is shown as a card summarizing their profile."
          )}
        </Section>
        <Section title={l("Cartes candidat", "Candidate cards")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Photo", "Photo")}</strong> — {l("Photo du candidat avec superposition du CV en arrière-plan", "Candidate photo with background resume preview")}</li>
            <li><strong>{l("Compétences", "Skills")}</strong> — {l("Nombre de compétences détectées", "Number of detected skills")}</li>
            <li><strong>{l("Expérience", "Experience")}</strong> — {l("Années d'expérience totale", "Total years of experience")}</li>
            <li><strong>{l("Langues", "Languages")}</strong> — {l("Nombre de langues parlées", "Number of spoken languages")}</li>
            <li><strong>{l("Statut talent", "Talent status")}</strong> — {l("Indique si le candidat est déjà désigné comme talent", "Indicates whether the candidate is already designated as talent")}</li>
          </ul>
        </Section>
        <Section title={l("Modal de détails", "Details modal")} searchQuery={searchQuery}>
          {l(
            "Cliquez sur une carte pour ouvrir le modal d'évaluation détaillée. Celui-ci affiche la compatibilité du candidat avec chaque département, les exigences remplies ou non, les expériences manquantes et les expériences supplémentaires.",
            "Click any card to open the detailed evaluation modal showing compatibility scores across departments, met or unmet requirements, missing skills, and additional experiences."
          )}
        </Section>
        <Section title={l("Désigner un talent", "Designate a talent")} searchQuery={searchQuery}>
          {language === "en" ? (
            <>
              From the details modal, you can mark a candidate as talent by clicking{" "}
              <strong>Set as Talent</strong>. Once designated, the candidate appears on the Talents page.
            </>
          ) : (
            <>
              Depuis le modal de détails, vous pouvez désigner un candidat comme talent en cliquant
              sur le bouton <strong>Définir comme un Talent</strong>. Une fois désigné, le candidat
              apparaîtra dans la page Talents.
            </>
          )}
        </Section>
      </div>
    </article>
  );
}

function ConnexionDoc({ searchQuery }: { searchQuery: string }) {
  const { l } = useLanguage();
  return (
    <article className="space-y-6">
      <DocHeader
        title={l("Connexion", "Sign in")}
        description={l("Page d'authentification de TalentFlow", "TalentFlow authentication page")}
        searchQuery={searchQuery}
      />
      <div className="space-y-4 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed">
        <Section title={l("Comment ça fonctionne", "How it works")} searchQuery={searchQuery}>
          {l(
            "La page de connexion est la première page que vous voyez en accédant à TalentFlow. Elle vous permet de vous authentifier avec vos identifiants pour accéder à votre espace de travail.",
            "The sign-in page is the entry point for TalentFlow. It lets you authenticate with your credentials to access your workspace."
          )}
        </Section>
        <Section title={l("Formulaire de connexion", "Sign-in form")} searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{l("Email", "Email")}</strong> — {l("Saisissez votre adresse email professionnelle", "Enter your work email address")}</li>
            <li><strong>{l("Mot de passe", "Password")}</strong> — {l("Saisissez votre mot de passe", "Enter your password")}</li>
            <li><strong>{l("Connexion", "Sign in")}</strong> — {l("Cliquez sur le bouton pour vous connecter", "Click the button to sign in")}</li>
          </ul>
        </Section>
        <Section title={l("Sécurité", "Security")} searchQuery={searchQuery}>
          {l(
            "La connexion est sécurisée et les sessions sont gérées côté client. Les routes de l'application sont protégées par authentification.",
            "Authentication is secured and all application routes enforce authenticated access automatically."
          )}
        </Section>
      </div>
    </article>
  );
}

function Section({ title, children, searchQuery }: { title: string; children: React.ReactNode; searchQuery: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-[#f3f2f1] mb-2">
        <HighlightText text={title} query={searchQuery} />
      </h3>
      <div className="text-slate-600 dark:text-[#c8c6c4]">{highlightTree(children, searchQuery)}</div>
    </div>
  );
}

export default function HelpPage() {
  const { t, l } = useLanguage();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const sections: DocSection[] = useMemo(
    () => [
      { id: "dashboard", label: l("Tableau de bord", "Dashboard") },
      { id: "talents", label: t.nav.talents },
      { id: "evaluations", label: t.nav.evaluations },
      { id: "departements", label: t.nav.departments },
      { id: "documents", label: t.nav.documents },
      { id: "jobs", label: t.nav.jobOffersPlural },
      { id: "recruitments", label: t.nav.recruitments },
      { id: "invitations", label: t.nav.invitations },
      { id: "profile", label: l("Profil", "Profile") },
      { id: "settings", label: t.nav.settings },
      { id: "connexion", label: l("Connexion", "Sign in") },
      { id: "admin", label: t.nav.admin },
      { id: "features", label: l("Fonctionnalités", "Features") },
    ],
    [t, l]
  );

  return (
    <AppShell
      title={t.nav.helpGuide}
      icon={<AtlasoftHelpIcon size={22} />}
      breadcrumbs={[{ label: t.nav.home, href: "/dashboard" }, { label: t.nav.help }]}
      backgroundClassName="bg-[#f3f2f1]"
      headerLeftExtra={
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 text-[#605e5c] dark:text-[#a19f9d] hover:text-[#323130] dark:hover:text-[#f3f2f1] lg:hidden"
          aria-label={l("Sommaire", "Table of contents")}
        >
          <BookOpen className="h-5 w-5" />
        </button>
      }
      headerCenter={
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#605e5c] dark:text-[#a19f9d]" />
          <input
            type="text"
            placeholder={l("Rechercher dans la documentation...", "Search documentation...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[2px] border border-[#8a8886] dark:border-[#3b3a39] bg-white dark:bg-[#252423] pl-9 pr-3 py-1.5 text-[12.5px] text-[#323130] dark:text-[#f3f2f1] placeholder:text-[#605e5c] dark:placeholder:text-[#a19f9d] focus:border-[#0078d4] focus:outline-none"
          />
        </div>
      }
    >
      <main className="flex-1 px-6 max-w-7xl mx-auto w-full py-6">
        <div className="flex gap-6">
          <aside className={`shrink-0 w-56 ${sidebarOpen ? "block" : "hidden"} lg:block`}>
            <nav className="sticky top-6 space-y-0.5">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setActiveSection(s.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md transition-colors ${
                    activeSection === s.id
                      ? "bg-slate-200 dark:bg-[#323130] text-slate-900 dark:text-white font-semibold"
                      : "text-slate-500 dark:text-[#a19f9d] hover:text-slate-800 dark:hover:text-[#f3f2f1] hover:bg-slate-100 dark:hover:bg-[#252423]"
                  }`}
                >
                  <span><HighlightText text={s.label} query={searchQuery} /></span>
                  {activeSection === s.id && (
                    <ChevronRight className="h-3.5 w-3.5 ml-auto text-slate-400" />
                  )}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0 bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] text-slate-700 dark:text-[#c8c6c4] mrc p-6 shadow-xs">
            <HelpContent section={activeSection} searchQuery={searchQuery} />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
