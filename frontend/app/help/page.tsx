"use client";

import React, { useState } from "react";
import {
  Home,
  Building2,
  FolderOpen,
  MailPlus,
  User,
  Settings,
  List,
  BookOpen,
  ChevronRight,
  Search,
} from "lucide-react";
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";

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

const sections: DocSection[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "talents", label: "Talents" },
  { id: "evaluations", label: "Évaluations" },
  { id: "departements", label: "Départements" },
  { id: "documents", label: "Documents" },
  { id: "jobs", label: "Offres d'emploi" },
  { id: "recruitments", label: "Recrutements" },
  { id: "invitations", label: "Invitations" },
  { id: "profile", label: "Profil" },
  { id: "settings", label: "Paramètres" },
  { id: "connexion", label: "Connexion" },
  { id: "admin", label: "Administration" },
  { id: "features", label: "Fonctionnalités" },
];

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
      <h2 className="text-lg font-bold text-slate-900">
        <HighlightText text={title} query={searchQuery} />
      </h2>
      <p className="text-sm text-slate-500 mt-1">
        <HighlightText text={description} query={searchQuery} />
      </p>
    </div>
  );
}

function DashboardDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Tableau de bord" description="Page d'accueil de TalentFlow" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          Le tableau de bord est la première page que vous voyez après connexion. Il sert de hub central
          pour accéder rapidement aux différentes sections de l&apos;application.
        </Section>
        <Section title="Cartes d&apos;accès rapide" searchQuery={searchQuery}>
          Chaque carte représente une section clé de l&apos;application. Passez la souris sur une carte
          pour voir les détails et cliquez sur le bouton pour accéder directement à la section.
        </Section>
        <Section title="Sections disponibles" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Gestion des talents</strong> — Consulter et gérer les profils talents</li>
            <li><strong>Analyse &amp; Statistiques</strong> — Suivre les indicateurs clés de recrutement</li>
            <li><strong>Documents &amp; Ressources</strong> — Centraliser les CV et rapports d&apos;évaluation</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function DepartementsDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Départements" description="Gestion des départements de l'entreprise" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page Départements vous permet de structurer votre organisation en créant et gérant
          les départements de votre entreprise, chacun avec ses propres exigences.
        </Section>
        <Section title="Fonctionnalités" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Recherche</strong> — Filtrez les départements par nom</li>
            <li><strong>Tri</strong> — Triez par nom ou par date de création</li>
            <li><strong>Création</strong> — Ajoutez un nouveau département avec son nom, années d&apos;expérience requises et compétences</li>
            <li><strong>Modification</strong> — Éditez un département existant en un clic</li>
            <li><strong>Suppression</strong> — Supprimez un département avec confirmation</li>
            <li><strong>Pagination</strong> — Navigation paginée (8 éléments par page)</li>
            <li><strong>Détails</strong> — Cliquez sur une ligne pour voir tous les détails dans un modal</li>
          </ul>
        </Section>
        <Section title="Compétences requises" searchQuery={searchQuery}>
          Les compétences sont saisies sous forme de texte séparé par le symbole <code className="bg-slate-100 px-1 rounded">+</code>.
          Dans le tableau, seules les 3 premières compétences sont affichées pour une meilleure lisibilité.
        </Section>
      </div>
    </article>
  );
}

function DocumentsDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Documents" description="Centralisation et gestion des CV et documents" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page Documents vous permet d&apos;importer, consulter et gérer tous les CV et documents
          liés aux candidatures et aux talents.
        </Section>
        <Section title="Fonctionnalités" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Import de CV</strong> — Importez un fichier PDF pour analyse automatique</li>
            <li><strong>Recherche</strong> — Filtrez les documents par nom ou contenu</li>
            <li><strong>Prévisualisation</strong> — Visualisez le contenu du CV directement dans l&apos;interface</li>
            <li><strong>Informations extraites</strong> — Consultez les données extraites automatiquement (nom, email, compétences, etc.)</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function InvitationsDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Invitations" description="Gestion des invitations des recruteurs" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page Invitations vous permet d&apos;inviter des recruteurs à rejoindre votre espace de travail
          et de suivre le statut de chaque invitation envoyée.
        </Section>
        <Section title="Fonctionnalités" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Inviter</strong> — Envoyez une invitation par email à un nouveau recruteur</li>
            <li><strong>Statuts</strong> — Suivez les invitations (En attente, Acceptée, Expirée)</li>
            <li><strong>Filtres</strong> — Filtrez par statut ou recherchez par email</li>
            <li><strong>Détails</strong> — Cliquez sur une invitation pour voir tous les détails</li>
            <li><strong>Actions</strong> — Renvoyez, copiez le lien ou révoquez une invitation depuis le modal de détails</li>
          </ul>
        </Section>
        <Section title="Statuts des invitations" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>En attente</strong> — L&apos;invitation a été envoyée mais pas encore acceptée</li>
            <li><strong>Acceptée</strong> — Le recruteur a rejoint l&apos;espace de travail</li>
            <li><strong>Expirée</strong> — Le délai de validité est dépassé</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function ProfileDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Profil" description="Gestion de votre compte utilisateur" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page Profil vous permet de consulter et modifier les informations de votre compte,
          de gérer votre photo de profil, de changer votre mot de passe et de consulter
          vos statistiques d&apos;activité.
        </Section>
        <Section title="Fonctionnalités" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Photo de profil</strong> — Modifiez votre avatar depuis l&apos;interface</li>
            <li><strong>Informations personnelles</strong> — Modifiez votre nom complet et votre adresse email</li>
            <li><strong>Mot de passe</strong> — Changez votre mot de passe (obligatoire à la première connexion)</li>
            <li><strong>Activités et statistiques</strong> — Consultez le nombre de CV analysés, les requêtes LLM par action et les statistiques d&apos;invitations (administrateurs uniquement)</li>
            <li><strong>Informations du compte</strong> — Consultez votre rôle, date d&apos;inscription, statut de vérification et méthode d&apos;authentification</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function SettingsDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Paramètres" description="Configuration de votre espace de travail" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page Paramètres regroupe la configuration de vos préférences de notification,
          les options de sécurité et la gestion de votre compte.
        </Section>
        <Section title="Onglets disponibles" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Notifications</strong> — Activez ou désactivez les notifications par email pour chaque type d&apos;événement (nouveau candidat, invitation acceptée, mises à jour système)</li>
            <li><strong>Sécurité</strong> — Modifiez votre mot de passe, consultez les détails de votre compte (rôle, statut, email vérifié) et accédez à la zone dangereuse</li>
          </ul>
        </Section>
        <Section title="Zone dangereuse" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Déconnexion</strong> — Déconnectez-vous de votre session</li>
            <li><strong>Suppression du compte</strong> — Supprimez définitivement votre compte et toutes vos données (CV, évaluations, talents, recrutements). Une confirmation par texte est requise avant suppression.</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function JobsDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Offres d'emploi" description="Gestion des offres d'emploi générées par l'IA" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page Offres d&apos;emploi vous permet de créer, consulter et gérer les offres d&apos;emploi
          de votre entreprise. Les offres peuvent être générées automatiquement par l&apos;IA à partir
          d&apos;une simple description.
        </Section>
        <Section title="Fonctionnalités" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Génération IA</strong> — Créez une offre d&apos;emploi automatiquement à partir d&apos;une description textuelle</li>
            <li><strong>Recherche</strong> — Filtrez les offres par titre, type de contrat ou mode de travail</li>
            <li><strong>Pagination</strong> — Navigation paginée (8 éléments par page)</li>
            <li><strong>Consultation</strong> — Visualisez les détails complets d&apos;une offre (titre, département, salaire, etc.)</li>
            <li><strong>Modification</strong> — Éditez une offre existante</li>
            <li><strong>Suppression</strong> — Supprimez une offre avec confirmation</li>
          </ul>
        </Section>
        <Section title="Informations disponibles" searchQuery={searchQuery}>
          Chaque offre d&apos;emploi affiche le titre, le département concerné, le type de contrat,
          le mode de travail, le niveau de séniorité, la fourchette de salaire et le statut de l&apos;offre.
        </Section>
      </div>
    </article>
  );
}

function RecruitmentsDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Recrutements" description="Suivi du pipeline de recrutement des talents" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page Recrutements vous permet de suivre l&apos;ensemble du pipeline de recrutement
          des candidats désignés comme talents, depuis la mise en relation jusqu&apos;à la décision finale.
        </Section>
        <Section title="Fonctionnalités" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Liste des recrutements</strong> — Visualisez tous les recrutements en cours sous forme de cartes</li>
            <li><strong>Recherche</strong> — Filtrez par nom du candidat ou intitulé du poste</li>
            <li><strong>Filtres</strong> — Filtrez par statut et priorité via un panneau dédié</li>
            <li><strong>Pagination</strong> — Navigation paginée (12 éléments par page)</li>
            <li><strong>Détails</strong> — Consultez les informations complètes du recrutement dans un modal à trois onglets (Informations, Entretien, Email)</li>
            <li><strong>Score du département</strong> — Le score du département associé au poste apparaît dans l&apos;en-tête du modal</li>
            <li><strong>Notes modifiables</strong> — Ajoutez ou modifiez les notes directement depuis le modal de détails</li>
            <li><strong>Annulation</strong> — Annulez un recrutement depuis le modal (uniquement pour les recrutements en attente). Les entretiens et emails associés sont supprimés automatiquement</li>
          </ul>
        </Section>
        <Section title="Onglet Entretien" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Planifiez un entretien avec date, heure, durée, lieu et nom de l&apos;intervieweur</li>
            <li>Consultez la liste des entretiens déjà planifiés avec leur statut</li>
          </ul>
        </Section>
        <Section title="Onglet Email" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Choisissez un entretien planifié existant pour pré-remplir automatiquement la date, l&apos;heure, la durée et le lieu</li>
            <li>Saisissez le nom de l&apos;entreprise et la langue souhaitée</li>
            <li>Générez un email d&apos;invitation professionnel via l&apos;IA (DeepSeek)</li>
            <li>Modifiez le sujet et le corps HTML avant envoi</li>
            <li>Consultez l&apos;historique des emails envoyés</li>
          </ul>
        </Section>
        <Section title="Statuts de recrutement" searchQuery={searchQuery}>
          Les recrutements peuvent avoir différents statuts : en attente, invitation envoyée, entretien confirmé,
          entretien terminé, offre envoyée, acceptée, refusée, candidat décliné, embauché ou annulé.
          Chaque statut est représenté par une couleur distinctive.
        </Section>
      </div>
    </article>
  );
}

function AdminDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Administration" description="Gestion des utilisateurs de la plateforme" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page Administration est accessible uniquement aux administrateurs. Elle permet de
          consulter la liste de tous les utilisateurs de la plateforme et leurs statistiques d&apos;utilisation.
        </Section>
        <Section title="Fonctionnalités" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Liste des utilisateurs</strong> — Visualisez tous les comptes recruteurs de la plateforme</li>
            <li><strong>Recherche</strong> — Filtrez les utilisateurs par nom ou email</li>
            <li><strong>Statistiques</strong> — Consultez le nombre de CV analysés et de requêtes LLM par utilisateur</li>
            <li><strong>Actualisation</strong> — Rafraîchissez la liste pour voir les données à jour</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function FeaturesDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Fonctionnalités implémentées" description="Liste complète des fonctionnalités disponibles" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Authentification et comptes" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Page de connexion sécurisée avec email et mot de passe</li>
            <li>Protection des routes par authentification</li>
            <li>Gestion de session avec stockage côté client (SessionProvider)</li>
            <li>Page de modification du profil utilisateur</li>
            <li>Photo de profil modifiable avec aperçu</li>
            <li>Informations personnelles éditables (nom, email)</li>
            <li>Changement de mot de passe avec confirmation</li>
            <li>Bannière de changement de mot de passe obligatoire à la première connexion</li>
            <li>Page d&apos;acceptation d&apos;invitation avec création de compte</li>
            <li>Déconnexion sécurisée</li>
            <li>Authentification via LinkedIn</li>
          </ul>
        </Section>

        <Section title="Profil et statistiques" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Photo de profil avec téléchargement, aperçu et annulation</li>
            <li>Édition en ligne du nom et de l&apos;email</li>
            <li>Changement de mot de passe avec validation</li>
            <li>Statistiques d&apos;activité : nombre de CV analysés</li>
            <li>Tableau des requêtes LLM par action avec total</li>
            <li>Statistiques d&apos;invitations (administrateurs uniquement)</li>
            <li>Informations du compte : rôle, statut, authentification, date d&apos;inscription</li>
          </ul>
        </Section>

        <Section title="Talents" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Affichage des talents sous forme de cartes en grille</li>
            <li>Score du candidat pour son meilleur département</li>
            <li>Date de désignation et nom du recruteur</li>
            <li>Photo du candidat ou avatar par défaut</li>
            <li>Mise à jour automatique depuis les évaluations</li>
            <li>Modal de détails avec compétences et expériences</li>
            <li>Action de recrutement depuis le profil talent</li>
            <li>Retrait d&apos;un talent avec confirmation</li>
          </ul>
        </Section>

        <Section title="Évaluations" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Liste des candidats évalués par l&apos;IA sous forme de cartes</li>
            <li>Aperçu des compétences, expérience et langues</li>
            <li>Modal de détails avec compatibilité par département</li>
            <li>Affichage des exigences remplies et manquantes</li>
            <li>Expériences supplémentaires du candidat</li>
            <li>Désignation d&apos;un candidat comme talent</li>
            <li>Validation LLM des évaluations générées</li>
          </ul>
        </Section>

        <Section title="Départements" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Liste paginée des départements (8 par page)</li>
            <li>Recherche par nom</li>
            <li>Tri par nom ou date de création</li>
            <li>Création d&apos;un département avec expérience et compétences requises</li>
            <li>Modification d&apos;un département</li>
            <li>Suppression avec confirmation</li>
            <li>Affichage limité à 3 compétences dans le tableau avec indicateur "+N"</li>
            <li>Modal de détails au clic sur une ligne</li>
          </ul>
        </Section>

        <Section title="Documents et CV" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Import de CV au format PDF</li>
            <li>Analyse automatique des documents (extraction d&apos;identité, compétences, expériences, formations, certifications, langues)</li>
            <li>Extraction des informations depuis le CV</li>
            <li>Prévisualisation des documents</li>
            <li>Recherche dans les documents</li>
            <li>Progression de l&apos;import avec étapes visuelles (multi-étape)</li>
            <li>Gestion des erreurs d&apos;import</li>
            <li>Pagination (8 éléments par page)</li>
            <li>Suppression de document avec confirmation</li>
          </ul>
        </Section>

        <Section title="Offres d'emploi" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Génération d&apos;offres d&apos;emploi par IA à partir d&apos;une description</li>
            <li>Liste des offres en grille avec recherche et pagination</li>
            <li>Consultation détaillée d&apos;une offre (titre, département, contrat, salaire, séniorité)</li>
            <li>Modification et suppression d&apos;offres</li>
            <li>Filtres par type de contrat et mode de travail</li>
          </ul>
        </Section>

        <Section title="Recrutements" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pipeline de recrutement des talents sous forme de cartes</li>
            <li>Recherche par nom du candidat ou intitulé du poste</li>
            <li>Filtres par statut et priorité</li>
            <li>Pagination (12 éléments par page)</li>
            <li>Modal de détails à trois onglets (Informations, Entretien, Email)</li>
            <li>Affichage du score du département dans l&apos;en-tête du modal</li>
            <li>Notes modifiables directement dans le modal</li>
            <li>Sélection d&apos;un entretien planifié pour générer un email</li>
            <li>Génération d&apos;email d&apos;invitation par IA (DeepSeek) avec choix de langue</li>
            <li>Annulation d&apos;un recrutement avec suppression des entretiens et emails associés</li>
            <li>Statuts : en attente, invitation envoyée, entretien confirmé, entretien terminé, offre envoyée, acceptée, refusée, candidat décliné, embauché, annulé</li>
          </ul>
        </Section>

        <Section title="Invitations" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Invitation de recruteurs par email</li>
            <li>Suivi des statuts (en attente, acceptée, expirée)</li>
            <li>Filtrage par statut et recherche par email</li>
            <li>Tri par date ou email</li>
            <li>Modal de détails avec actions (renvoyer, copier le lien, révoquer, supprimer)</li>
            <li>Barre de métriques (en attente, acceptées, expirées, total)</li>
            <li>Page d&apos;acceptation d&apos;invitation publique</li>
          </ul>
        </Section>

        <Section title="Administration" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Liste des utilisateurs de la plateforme (administrateurs uniquement)</li>
            <li>Recherche par nom ou email</li>
            <li>Statistiques par utilisateur : nombre de CV analysés et requêtes LLM</li>
            <li>Actualisation des données en temps réel</li>
          </ul>
        </Section>

        <Section title="Paramètres et sécurité" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestion des préférences de notification par email (nouveau candidat, invitation acceptée, mises à jour)</li>
            <li>Modification du mot de passe avec confirmation</li>
            <li>Informations de sécurité du compte (rôle, statut, email vérifié, date d&apos;inscription)</li>
            <li>Déconnexion de la session</li>
            <li>Suppression du compte avec confirmation par texte obligatoire</li>
          </ul>
        </Section>

        <Section title="Interface et navigation" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Barre latérale de navigation responsive</li>
            <li>Indicateur de page active</li>
            <li>Mode mobile avec menu hamburger</li>
            <li>Notifications en temps réel (toasts) avec indicateur de notification</li>
            <li>Feed d&apos;activités récentes sur le tableau de bord</li>
            <li>Indicateur de progression des tâches système (SystemJobs)</li>
            <li>Design épuré et cohérent</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function TalentsDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Talents" description="Candidats désignés comme talents par les recruteurs" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page Talents affiche les candidats que les recruteurs ont désignés comme talents.
          Chaque talent est présenté sous forme de carte avec ses informations clés et son score.
        </Section>
        <Section title="Cartes talent" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Photo</strong> — Photo du candidat ou avatar par défaut</li>
            <li><strong>Score</strong> — Score le plus élevé obtenu par le candidat</li>
            <li><strong>Département</strong> — Meilleur département correspondant au profil</li>
            <li><strong>Talent depuis</strong> — Date de désignation en tant que talent</li>
            <li><strong>Défini par</strong> — Nom du recruteur ayant désigné le talent</li>
          </ul>
        </Section>
        <Section title="Statut talent" searchQuery={searchQuery}>
          Le statut de talent est attribué depuis la page Évaluations. Après avoir consulté
          les résultats détaillés de l&apos;évaluation d&apos;un candidat, vous pouvez décider de le
          désigner comme talent. Les talents apparaissent automatiquement dans cette page.
        </Section>
      </div>
    </article>
  );
}

function EvaluationsDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Évaluations" description="Consultation des candidats évalués par l'intelligence artificielle" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page Évaluations liste les candidats dont le CV a été analysé par l&apos;intelligence
          artificielle. Chaque candidat est présenté sous forme de carte avec un aperçu de son profil.
        </Section>
        <Section title="Cartes candidat" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Photo</strong> — Photo du candidat avec superposition du CV en arrière-plan</li>
            <li><strong>Compétences</strong> — Nombre de compétences détectées</li>
            <li><strong>Expérience</strong> — Années d&apos;expérience totale</li>
            <li><strong>Langues</strong> — Nombre de langues parlées</li>
            <li><strong>Statut talent</strong> — Indique si le candidat est déjà désigné comme talent</li>
          </ul>
        </Section>
        <Section title="Modal de détails" searchQuery={searchQuery}>
          Cliquez sur une carte pour ouvrir le modal d&apos;évaluation détaillée. Celui-ci affiche
          la compatibilité du candidat avec chaque département, les exigences remplies ou non,
          les expériences manquantes et les expériences supplémentaires.
        </Section>
        <Section title="Désigner un talent" searchQuery={searchQuery}>
          Depuis le modal de détails, vous pouvez désigner un candidat comme talent en cliquant
          sur le bouton <strong>Définir comme un Talent</strong>. Une fois désigné, le candidat
          apparaîtra dans la page Talents.
        </Section>
      </div>
    </article>
  );
}

function ConnexionDoc({ searchQuery }: { searchQuery: string }) {
  return (
    <article className="space-y-6">
      <DocHeader title="Connexion" description="Page d'authentification de TalentFlow" searchQuery={searchQuery} />
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne" searchQuery={searchQuery}>
          La page de connexion est la première page que vous voyez en accédant à TalentFlow.
          Elle vous permet de vous authentifier avec vos identifiants pour accéder à votre
          espace de travail.
        </Section>
        <Section title="Formulaire de connexion" searchQuery={searchQuery}>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Email</strong> — Saisissez votre adresse email professionnelle</li>
            <li><strong>Mot de passe</strong> — Saisissez votre mot de passe</li>
            <li><strong>Connexion</strong> — Cliquez sur le bouton pour vous connecter</li>
          </ul>
        </Section>
        <Section title="Sécurité" searchQuery={searchQuery}>
          La connexion est sécurisée et les sessions sont gérées côté client.
          Les routes de l&apos;application sont protégées par authentification.
        </Section>
      </div>
    </article>
  );
}

function Section({ title, children, searchQuery }: { title: string; children: React.ReactNode; searchQuery: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-2">
        <HighlightText text={title} query={searchQuery} />
      </h3>
      <div className="text-slate-600">{highlightTree(children, searchQuery)}</div>
    </div>
  );
}

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="grid grid-cols-3 items-center border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 -ml-1 text-slate-400 hover:text-slate-600 lg:hidden"
            >
              <BookOpen className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 whitespace-nowrap">Guide d&apos;utilisation</h1>
          </div>
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-full focus:outline-none focus:ring-1 focus:ring-slate-400 bg-slate-50"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <NotificationButton />
          </div>
        </header>

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
                        ? "bg-slate-200 text-slate-900 font-semibold"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
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

            <div className="flex-1 min-w-0 bg-white border border-slate-100 mrc p-6 shadow-xs">
              <HelpContent section={activeSection} searchQuery={searchQuery} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
