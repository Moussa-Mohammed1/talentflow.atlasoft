"use client";

import { useState } from "react";
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
} from "lucide-react";
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";

interface DocSection {
  id: string;
  label: string;
}

const sections: DocSection[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "departements", label: "Départements" },
  { id: "documents", label: "Documents" },
  { id: "invitations", label: "Invitations" },
  { id: "profile", label: "Profil" },
  { id: "settings", label: "Paramètres" },
  { id: "features", label: "Fonctionnalités" },
];

function HelpContent({ section }: { section: string }) {
  switch (section) {
    case "dashboard":
      return <DashboardDoc />;
    case "departements":
      return <DepartementsDoc />;
    case "documents":
      return <DocumentsDoc />;
    case "invitations":
      return <InvitationsDoc />;
    case "profile":
      return <ProfileDoc />;
    case "settings":
      return <SettingsDoc />;
    case "features":
      return <FeaturesDoc />;
    default:
      return <DashboardDoc />;
  }
}

function DashboardDoc() {
  return (
    <article className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Tableau de bord</h2>
        <p className="text-sm text-slate-500 mt-1">Page d&apos;accueil de TalentFlow</p>
      </div>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne">
          Le tableau de bord est la première page que vous voyez après connexion. Il sert de hub central
          pour accéder rapidement aux différentes sections de l&apos;application.
        </Section>
        <Section title="Cartes d&apos;accès rapide">
          Chaque carte représente une section clé de l&apos;application. Passez la souris sur une carte
          pour voir les détails et cliquez sur le bouton pour accéder directement à la section.
        </Section>
        <Section title="Sections disponibles">
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

function DepartementsDoc() {
  return (
    <article className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Départements</h2>
        <p className="text-sm text-slate-500 mt-1">Gestion des départements de l&apos;entreprise</p>
      </div>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne">
          La page Départements vous permet de structurer votre organisation en créant et gérant
          les départements de votre entreprise, chacun avec ses propres exigences.
        </Section>
        <Section title="Fonctionnalités">
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
        <Section title="Compétences requises">
          Les compétences sont saisies sous forme de texte séparé par le symbole <code className="bg-slate-100 px-1 rounded">+</code>.
          Dans le tableau, seules les 3 premières compétences sont affichées pour une meilleure lisibilité.
        </Section>
      </div>
    </article>
  );
}

function DocumentsDoc() {
  return (
    <article className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Documents</h2>
        <p className="text-sm text-slate-500 mt-1">Centralisation et gestion des CV et documents</p>
      </div>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne">
          La page Documents vous permet d&apos;importer, consulter et gérer tous les CV et documents
          liés aux candidatures et aux talents.
        </Section>
        <Section title="Fonctionnalités">
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

function InvitationsDoc() {
  return (
    <article className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Invitations</h2>
        <p className="text-sm text-slate-500 mt-1">Gestion des invitations des recruteurs</p>
      </div>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne">
          La page Invitations vous permet d&apos;inviter des recruteurs à rejoindre votre espace de travail
          et de suivre le statut de chaque invitation envoyée.
        </Section>
        <Section title="Fonctionnalités">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Inviter</strong> — Envoyez une invitation par email à un nouveau recruteur</li>
            <li><strong>Statuts</strong> — Suivez les invitations (En attente, Acceptée, Expirée)</li>
            <li><strong>Filtres</strong> — Filtrez par statut ou recherchez par email</li>
            <li><strong>Détails</strong> — Cliquez sur une invitation pour voir tous les détails</li>
            <li><strong>Actions</strong> — Renvoyez, copiez le lien ou révoquez une invitation depuis le modal de détails</li>
          </ul>
        </Section>
        <Section title="Statuts des invitations">
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

function ProfileDoc() {
  return (
    <article className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Profil</h2>
        <p className="text-sm text-slate-500 mt-1">Gestion de votre compte utilisateur</p>
      </div>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne">
          La page Profil vous permet de consulter et modifier les informations de votre compte,
          ainsi que de gérer votre photo de profil.
        </Section>
        <Section title="Fonctionnalités">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Photo de profil</strong> — Modifiez votre avatar depuis l&apos;interface</li>
            <li><strong>Informations personnelles</strong> — Modifiez votre nom complet et votre adresse email</li>
            <li><strong>Informations du compte</strong> — Consultez votre rôle, date d&apos;inscription et statut de vérification</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function SettingsDoc() {
  return (
    <article className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Paramètres</h2>
        <p className="text-sm text-slate-500 mt-1">Configuration de votre espace de travail</p>
      </div>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Comment ça fonctionne">
          La page Paramètres regroupe la configuration de vos préférences de notification,
          les options de sécurité et la gestion des invitations.
        </Section>
        <Section title="Onglets disponibles">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Notifications</strong> — Activez ou désactivez les notifications par email pour chaque type d&apos;événement</li>
            <li><strong>Sécurité</strong> — Modifiez votre mot de passe et consultez les informations de connexion</li>
            <li><strong>Invitations</strong> — Gérez les invitations que vous avez reçues</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function FeaturesDoc() {
  return (
    <article className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Fonctionnalités implémentées</h2>
        <p className="text-sm text-slate-500 mt-1">Liste complète des fonctionnalités disponibles</p>
      </div>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <Section title="Authentification et comptes">
          <ul className="list-disc pl-5 space-y-1">
            <li>Connexion sécurisée avec email et mot de passe</li>
            <li>Protection des routes par authentification</li>
            <li>Gestion de session avec stockage côté client</li>
            <li>Page de modification du profil utilisateur</li>
            <li>Photo de profil modifiable</li>
            <li>Informations personnelles éditables (nom, email)</li>
          </ul>
        </Section>

        <Section title="Départements">
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

        <Section title="Documents et CV">
          <ul className="list-disc pl-5 space-y-1">
            <li>Import de CV au format PDF</li>
            <li>Analyse automatique des documents</li>
            <li>Extraction des informations (identité, compétences)</li>
            <li>Prévisualisation des documents</li>
            <li>Recherche dans les documents</li>
            <li>Progression de l&apos;import avec étapes visuelles</li>
            <li>Gestion des erreurs d&apos;import</li>
          </ul>
        </Section>

        <Section title="Invitations">
          <ul className="list-disc pl-5 space-y-1">
            <li>Invitation de recruteurs par email</li>
            <li>Suivi des statuts (en attente, acceptée, expirée)</li>
            <li>Filtrage par statut et recherche par email</li>
            <li>Tri par date ou email</li>
            <li>Modal de détails avec actions (renvoyer, copier le lien, révoquer, supprimer)</li>
            <li>Page d&apos;acceptation d&apos;invitation</li>
          </ul>
        </Section>

        <Section title="Paramètres et configuration">
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestion des préférences de notification par email</li>
            <li>Modification du mot de passe</li>
            <li>Informations de sécurité du compte</li>
            <li>Gestion des invitations reçues</li>
          </ul>
        </Section>

        <Section title="Interface et navigation">
          <ul className="list-disc pl-5 space-y-1">
            <li>Barre latérale de navigation responsive</li>
            <li>Indicateur de page active</li>
            <li>Mode mobile avec menu hamburger</li>
            <li>Notifications en temps réel (toasts)</li>
            <li>Bannière de changement de mot de passe obligatoire</li>
            <li>Design épuré et cohérent</li>
          </ul>
        </Section>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-2">{title}</h3>
      <div className="text-slate-600">{children}</div>
    </div>
  );
}

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 -ml-1 text-slate-400 hover:text-slate-600 lg:hidden"
            >
              <BookOpen className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Guide d&apos;utilisation</h1>
          </div>
          <NotificationButton />
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
                    <span>{s.label}</span>
                    {activeSection === s.id && (
                      <ChevronRight className="h-3.5 w-3.5 ml-auto text-slate-400" />
                    )}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="flex-1 min-w-0 bg-white border border-slate-100 mrc p-6 shadow-xs">
              <HelpContent section={activeSection} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
