"use client";

import { useState } from 'react';
import { ArrowRight, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import Sidebar from '@/components/layouts/Sidebar';
import NotificationButton from '@/components/ui/NotificationButton';
import PasswordChangeBanner from '@/components/ui/PasswordChangeBanner';
import RecentActivities from '@/components/ui/RecentActivities';
import { useRouter } from 'next/navigation';
export default function Dashboard() {
  const router = useRouter();
  const [guideOpen, setGuideOpen] = useState(true);
  const cardsData = [
    {
    title: "Guide de démarrage",
    path: "/help",
    buttonText: "Commencer",
    subtitle: "Prenez en main TalentFlow",
    description:
      "Découvrez étape par étape comment gérer vos recrutements, analyser les candidatures et exploiter les fonctionnalités de la plateforme.",
    illustration: "/static/Acceuil/help.svg"
  },
  {
    title: "Gestion des talents",
    path: "/talents",
    buttonText: "Accéder",
    subtitle: "Consulter et gérer les profils talents",
    description:
      "Explorez les profils des candidats, leurs compétences, expériences, évaluations et disponibilités afin d'identifier les meilleurs talents.",
    illustration: "/static/Acceuil/talents.svg"
  },
  {
    title: "Analyse & Statistiques",
    path: "/evaluations",
    buttonText: "Voir",
    subtitle: "Suivre les indicateurs clés de recrutement",
    description:
      "Visualisez les performances du recrutement grâce à des tableaux de bord, des statistiques détaillées et des indicateurs de suivi des talents.",
    illustration: "/static/Acceuil/analysis.svg",
  },
  {
    title: "Documents & Ressources",
    path: "/documents",
    buttonText: "Accéder",
    subtitle: "Centraliser les ressources et documents",
    description:
      "Retrouvez les CV, rapports d'évaluation et autres documents nécessaires à la gestion des talents et des recrutements.",
    illustration: "/static/Acceuil/documents.svg"
  }  
];

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-slate-200">
      
      <Sidebar/>
 
      <div className="flex-1 flex flex-col min-h-screen">
        
        <header className="bg-white px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-slate-900">Accueil</h1>
          <NotificationButton/>
        </header>
       
        <main className="flex-1 px-6 py-6">
          <div className="mb-6 rounded-lg">
            <p className="text-sm leading-7 text-slate-600">
              Vous trouverez ci-dessous les raccourcis permettant d'accéder rapidement aux principales fonctionnalités de la plateforme.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {cardsData.map((card, index) => (
              <div
                key={index}
                className="group bg-white border border-slate-100 mrc cursor-pointer h-52 overflow-hidden relative"
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
                  <h2 className="text-sm font-bold text-indigo-900 text-center">{card.title}</h2>
                </div>

                <div className="absolute inset-0 p-4 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100">
                  <h3 className="text-xs font-bold text-slate-900 leading-tight text-center mb-1">
                    {card.subtitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed text-center line-clamp-3">
                    {card.description}
                  </p>
                  <div className="flex justify-center mt-2">
                    <button 
                    onClick={() => router.push(card.path)}
                    className="flex items-center gap-1 cursor-pointer text-xs font-semibold text-indigo-600 border border-slate-200 rounded px-2.5 py-1 hover:bg-indigo-50 transition-colors">
                      {card.buttonText}
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-6xl mx-auto mt-10">
            <div className="bg-white border border-slate-100 mrc shadow-xs">
              <button
                onClick={() => setGuideOpen(!guideOpen)}
                className="w-full flex items-center justify-between px-5 py-3 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold text-slate-900">Parcours recommandé</span>
                </div>
                {guideOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>

              {guideOpen && (
                <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed space-y-3">
                  <p className="text-xs text-slate-500">
                    Suivez ces étapes dans l&apos;ordre pour exploiter pleinement TalentFlow&nbsp;:
                  </p>

                  <div className="space-y-2">
                    <Step number={1} title="Préparer les départements">
                      Rendez-vous dans <strong>Resources → Départements</strong> et assurez-vous que chaque département existe avec ses <strong>compétences requises</strong> bien renseignées. Ces données servent de référence pour toutes les évaluations.
                    </Step>

                    <Step number={2} title="Importer un CV">
                      Allez dans <strong>Documents</strong>, cliquez sur <strong>Importer un candidat</strong>, sélectionnez le CV, puis cliquez sur <strong>Importer et extraire tous</strong>. Le CV sera enregistré et ses données extraites automatiquement.
                    </Step>

                    <Step number={3} title="Vérifier les données extraites">
                      Le CV apparaît dans la liste des documents. Cliquez dessus pour voir les <strong>informations extraites</strong> du candidat. Si des données sont erronées, <strong>modifiez-les</strong>. Si l&apos;extraction est encore en cours, consultez les <strong>tâches en arrière-plan</strong>. Si l&apos;extraction est terminée mais qu&apos;aucune donnée n&apos;apparaît, cliquez sur <strong>Re-analyser l&apos;identité</strong> ou <strong>Re-analyser tout</strong>.
                    </Step>

                    <Step number={4} title="Évaluer le candidat">
                      Une fois les données validées, cliquez sur <strong>Évaluer</strong>. La compatibilité entre le candidat et chaque département sera calculée et affichée en pourcentages.
                    </Step>

                    <Step number={5} title="Consulter les évaluations">
                      Rendez-vous dans la page <strong>Évaluations</strong> pour voir les résultats par candidat. Si un profil vous intéresse, <strong>marquez-le comme Talent</strong>.
                    </Step>

                    <Step number={6} title="Publier une offre d&apos;emploi (obligatoire)">
                      Avant de recruter, vous devez d&apos;abord disposer d&apos;une <strong>offre d&apos;emploi</strong> publiée. Rendez-vous dans l&apos;onglet <strong>Offre d&apos;emploi</strong>, cliquez sur <strong>Ajouter une offre</strong>. Une modale s&apos;ouvre&nbsp;: collez la <strong>description du poste</strong>, le système extrait automatiquement les données. Assurez-vous que le statut est <strong>Publié</strong> (les offres non publiées ne sont pas recrutables) et qu&apos;un <strong>département</strong> lui est assigné. De bonnes données d&apos;offre, notamment le département et ses compétences requises, faciliteront la sélection des talents préférés (le score d&apos;évaluation repose sur les compétences du département).
                    </Step>

                    <Step number={7} title="Recruter un talent">
                      Dans la page <strong>Talents</strong>, retrouvez vos talents marqués. Cliquez sur <strong>Recruter</strong> pour lancer le processus de recrutement. Le candidat apparaîtra dans la page <strong>Recrutements</strong>.
                    </Step>

                    <Step number={8} title="Planifier l&apos;entretien">
                      Dans le modal de recrutement, allez dans l&apos;onglet <strong>Entretien</strong>. Renseignez la date, l&apos;heure, la durée et le lieu, puis cliquez sur <strong>Planifier l&apos;entretien</strong>.
                    </Step>

                    <Step number={9} title="Générer et envoyer l&apos;email">
                      Passez à l&apos;onglet <strong>Email</strong>. Sélectionnez l&apos;entretien planifié pour pré-remplir les informations (ou saisissez-les manuellement). Choisissez la <strong>langue</strong> et cliquez sur <strong>Générer l&apos;email</strong>. Vérifiez le sujet et le contenu, puis cliquez sur <strong>Envoyer l&apos;email</strong>.
                    </Step>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      <strong>Note&nbsp;:</strong> Chaque étape est indépendante. Vous pouvez revenir en arrière à tout moment pour corriger ou ajuster les informations.
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
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-black text-xs font-bold mt-0.5">
        {number}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{children}</p>
      </div>
    </div>
  );
}