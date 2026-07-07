"use client";

import { ArrowRight } from 'lucide-react';
import Sidebar from '@/components/layouts/Sidebar';
import NotificationButton from '@/components/ui/NotificationButton';
import PasswordChangeBanner from '@/components/ui/PasswordChangeBanner';
import RecentActivities from '@/components/ui/RecentActivities';
import { useRouter } from 'next/navigation';
export default function Dashboard() {
  const router = useRouter();
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
    path: "/evalutaions",
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

          <div className="max-w-6xl mx-auto mt-8">
            <RecentActivities />
          </div>
        </main>
      </div>
    </div>
  );
}