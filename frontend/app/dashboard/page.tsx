"use client";

import { useState } from "react";
import { ArrowRight, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftHomeIcon } from "@/components/layouts/AtlasoftIcons";
import RecentActivities from "@/components/ui/RecentActivities";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function Dashboard() {
  const router = useRouter();
  const { t, l } = useLanguage();
  const [guideOpen, setGuideOpen] = useState(true);

  const cardsData = [
    {
      title: l("Guide de démarrage", "Getting Started Guide"),
      path: "/help",
      buttonText: l("Commencer", "Get Started"),
      subtitle: l("Prenez en main TalentFlow", "Master TalentFlow"),
      description: l(
        "Découvrez étape par étape comment gérer vos recrutements, analyser les candidatures et exploiter les fonctionnalités de la plateforme.",
        "Discover step by step how to manage your recruitments, analyze applications, and leverage all platform capabilities."
      ),
      illustration: "/static/Acceuil/help.svg",
    },
    {
      title: l("Gestion des talents", "Talent Management"),
      path: "/talents",
      buttonText: l("Accéder", "Open"),
      subtitle: l("Consulter et gérer les profils talents", "Browse and manage talent profiles"),
      description: l(
        "Explorez les profils des candidats, leurs compétences, expériences, évaluations et disponibilités afin d'identifier les meilleurs talents.",
        "Explore candidate profiles, skills, experiences, evaluations, and availability to identify top talent."
      ),
      illustration: "/static/Acceuil/talents.svg",
    },
    {
      title: l("Analyse & Statistiques", "Analytics & Insights"),
      path: "/evaluations",
      buttonText: l("Voir", "View"),
      subtitle: l("Suivre les indicateurs clés de recrutement", "Track key recruitment metrics"),
      description: l(
        "Visualisez les performances du recrutement grâce à des tableaux de bord, des statistiques détaillées et des indicateurs de suivi des talents.",
        "Visualize recruitment performance through structured views, detailed scoring, and candidate tracking indicators."
      ),
      illustration: "/static/Acceuil/analysis.svg",
    },
    {
      title: l("Documents & Ressources", "Documents & Resources"),
      path: "/documents",
      buttonText: l("Accéder", "Open"),
      subtitle: l("Centraliser les ressources et documents", "Centralize resources and documents"),
      description: l(
        "Retrouvez les CV, rapports d'évaluation et autres documents nécessaires à la gestion des talents et des recrutements.",
        "Access resumes, evaluation reports, and other documents essential to talent and recruitment workflows."
      ),
      illustration: "/static/Acceuil/documents.svg",
    },
  ];

  return (
    <AppShell
      title={t.nav.home}
      icon={<AtlasoftHomeIcon size={22} />}
      breadcrumbs={[{ label: t.nav.home }]}
      backgroundClassName="bg-[#f3f2f1]"
    >
      <main className="flex-1 px-6 py-6">
        <div className="mb-6 rounded-lg">
          <p className="text-sm leading-7 text-slate-600 dark:text-[#c8c6c4]">
            {l(
              "Page d'accueil de TalentFlow. Retrouvez les raccourcis vers les principales fonctionnalités : Guide de démarrage, Gestion des talents, Analyse & Statistiques, Documents & Ressources. Consultez le parcours recommandé pour suivre les bonnes pratiques et visionnez les activités récentes.",
              "Welcome to TalentFlow. Access quick shortcuts to core features: Getting Started Guide, Talent Management, Analytics & Insights, and Documents & Resources. Follow the recommended workflow and track recent activity below."
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {cardsData.map((card, index) => (
            <div
              key={index}
              onClick={() => router.push(card.path)}
              className="group bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc cursor-pointer h-52 overflow-hidden relative"
            >
              <div className="absolute inset-0 p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 opacity-100 group-hover:opacity-0 group-hover:scale-95">
                {card.illustration && (
                  <div className="flex-shrink-0">
                    <img
                      src={card.illustration}
                      alt={card.title}
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                )}
                <h2 className="text-sm font-bold text-indigo-900 dark:text-[#4ea8ff] text-center">
                  {card.title}
                </h2>
              </div>

              <div className="absolute inset-0 p-4 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100">
                <h3 className="text-xs font-bold text-slate-900 dark:text-[#f3f2f1] leading-tight text-center mb-1">
                  {card.subtitle}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#a19f9d] leading-relaxed text-center line-clamp-3">
                  {card.description}
                </p>
                <div className="flex justify-center mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(card.path);
                    }}
                    className="flex items-center gap-1 cursor-pointer text-xs font-semibold text-indigo-600 dark:text-[#4ea8ff] border border-slate-200 dark:border-[#3b3a39] rounded px-2.5 py-1 hover:bg-indigo-50 dark:hover:bg-[#323130] transition-colors"
                  >
                    {card.buttonText}
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto mt-10">
          <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc shadow-xs">
            <button
              onClick={() => setGuideOpen(!guideOpen)}
              className="w-full flex items-center justify-between px-5 py-3 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-[#f3f2f1]">
                  {l("Parcours recommandé", "Recommended workflow")}
                </span>
              </div>
              {guideOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {guideOpen && (
              <div className="px-5 pb-5 pt-1 text-sm text-slate-600 dark:text-[#c8c6c4] leading-relaxed space-y-3">
                <p className="text-xs text-slate-500 dark:text-[#a19f9d]">
                  {l(
                    "Suivez ces étapes dans l'ordre pour exploiter pleinement TalentFlow :",
                    "Follow these steps in order to get the most out of TalentFlow:"
                  )}
                </p>

                <div className="space-y-2">
                  <Step number={1} title={l("Préparer les départements", "Set up departments")}>
                    {l(
                      "Rendez-vous dans Ressources → Départements et assurez-vous que chaque département existe avec ses compétences requises bien renseignées. Ces données servent de référence pour toutes les évaluations.",
                      "Go to Resources → Departments and ensure each department exists with its required skills configured. These criteria serve as the benchmark for all evaluations."
                    )}
                  </Step>

                  <Step number={2} title={l("Importer un CV", "Import a resume")}>
                    {l(
                      "Allez dans Documents, cliquez sur Importer un candidat, sélectionnez le CV, puis cliquez sur Importer & extraire tous. Le CV sera enregistré et ses données extraites automatiquement.",
                      "Go to Documents, click Import candidate, select the resume file, then click Import & extract all. The resume will be saved and parsed automatically."
                    )}
                  </Step>

                  <Step number={3} title={l("Vérifier les données extraites", "Review extracted data")}>
                    {l(
                      "Le CV apparaît dans la liste des documents. Cliquez dessus pour voir les informations extraites du candidat et corrigez-les si besoin. Suivez les tâches de fond si l'analyse est encore en cours.",
                      "The resume appears in the documents list. Click it to inspect extracted candidate details and edit any field if needed. Check background tasks if extraction is still running."
                    )}
                  </Step>

                  <Step number={4} title={l("Évaluer le candidat", "Evaluate the candidate")}>
                    {l(
                      "Une fois les données validées, cliquez sur Évaluer. La compatibilité entre le candidat et chaque département sera calculée et affichée en pourcentages.",
                      "Once the data is verified, click Evaluate. Compatibility between the candidate and each department will be computed as percentage scores."
                    )}
                  </Step>

                  <Step number={5} title={l("Consulter les évaluations", "Review evaluations")}>
                    {l(
                      "Rendez-vous dans la page Évaluations pour voir les résultats par candidat. Si un profil vous intéresse, marquez-le comme Talent.",
                      "Open the Evaluations page to browse scores per candidate. When a profile stands out, mark them as a Talent."
                    )}
                  </Step>

                  <Step number={6} title={l("Publier une offre d'emploi (obligatoire)", "Publish a job offer (required)")}>
                    {l(
                      "Avant de recruter, créez une offre d'emploi publiée dans Offres d'emploi en lui assignant un département et le statut Publiée.",
                      "Before starting recruitment, create a job offer in Job Offers, assign a department, and set its status to Published."
                    )}
                  </Step>

                  <Step number={7} title={l("Recruter un talent", "Recruit a talent")}>
                    {l(
                      "Dans la page Talents, retrouvez vos talents marqués. Cliquez sur Recruter pour lancer le processus de recrutement dans la page Recrutements.",
                      "In Talents, find your bookmarked candidates and click Recruit to launch a recruitment workflow in Recruitments."
                    )}
                  </Step>

                  <Step number={8} title={l("Planifier l'entretien", "Schedule the interview")}>
                    {l(
                      "Dans la modale de recrutement, ouvrez l'onglet Entretien, renseignez la date, l'heure, la durée et le lieu, puis cliquez sur Planifier l'entretien.",
                      "Inside the recruitment detail modal, switch to the Interview tab, fill in the date, time, duration, and location, then schedule the interview."
                    )}
                  </Step>

                  <Step number={9} title={l("Générer et envoyer l'email", "Generate and send the email")}>
                    {l(
                      "Passez à l'onglet Email, sélectionnez l'entretien planifié, choisissez la langue, générez l'aperçu IA, puis envoyez l'invitation.",
                      "Switch to the Email tab, pick the scheduled interview, select the language, generate the AI draft, review it, and send the email."
                    )}
                  </Step>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-[#3b3a39]">
                  <p className="text-xs text-slate-400 dark:text-[#a19f9d]">
                    <strong>{l("Note :", "Note:")}</strong>{" "}
                    {l(
                      "Chaque étape est indépendante. Vous pouvez revenir en arrière à tout moment pour corriger ou ajuster les informations.",
                      "Each step is independent. You can revisit any stage at any time to update or refine information."
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-6">
          <RecentActivities />
        </div>
      </main>
    </AppShell>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-[#323130] text-black dark:text-[#f3f2f1] text-xs font-bold mt-0.5">
        {number}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-[#f3f2f1]">{title}</p>
        <p className="text-xs text-slate-500 dark:text-[#a19f9d] mt-0.5">{children}</p>
      </div>
    </div>
  );
}
