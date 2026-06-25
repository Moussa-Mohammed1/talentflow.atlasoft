"use client";

import { useState } from 'react';
import { 
  Briefcase, 
  BarChart2, 
  Bell, 
  ArrowRight,
} from 'lucide-react';
import Sidebar from '@/components/layouts/Sidebar';
import NotificationButton from '@/components/ui/NotificationButton';
import PasswordChangeBanner from '@/components/ui/PasswordChangeBanner';

export default function Dashboard() {
  
  const cardsData = [
  {
    title: "Gestion des talents",
    buttonText: "Accéder",
    subtitle: "Consulter et gérer les profils talents",
    description:
      "Explorez les profils des candidats, leurs compétences, expériences, évaluations et disponibilités afin d'identifier les meilleurs talents.",
    illustration: "/static/Acceuil/talents.svg"
  },
  {
    title: "Analyse & Statistiques",
    buttonText: "Voir",
    subtitle: "Suivre les indicateurs clés de recrutement",
    description:
      "Visualisez les performances du recrutement grâce à des tableaux de bord, des statistiques détaillées et des indicateurs de suivi des talents.",
    illustration: "/static/Acceuil/analysis.svg",
  },
  {
    title: "Documents & Ressources",
    buttonText: "Accéder",
    subtitle: "Centraliser les ressources et documents",
    description:
      "Retrouvez les CV, rapports d'évaluation et autres documents nécessaires à la gestion des talents et des recrutements.",
    illustration: "/static/Acceuil/documents.svg"
  }
];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-slate-200">
      
      <Sidebar/>
 
      <div className="flex-1 flex flex-col min-h-screen">
        
        
        <header className="bg-slate-50 px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-slate-900">Accueil</h1>
          <NotificationButton/>
        </header>
       
        <main className="flex-1 px-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {cardsData.map((card, index) => (
              <div 
                key={index} 
                className="bg-white border border-slate-100 rounded-xl p-4  flex flex-col justify-between min-h-[180px]"
              >
                
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-sm font-bold text-indigo-900">{card.title}</h2>
                  <button className="flex items-center gap-1 cursor-pointer text-xs font-semibold text-indigo-600 border border-slate-200 rounded px-2.5 py-1 hover:bg-indigo-50 transition-colors">
                    {card.buttonText}
                    <ArrowRight size={12} />
                  </button>
                </div>

                 <div className="flex gap-4 items-start flex-1">
                  {card.illustration && (
                    <div className="hidden sm:block flex-shrink-0">
                      <img
                        src={card.illustration}
                        alt={card.title}
                        className="w-20 h-20 object-contain"
                      />
                    </div>
                  )}
                  <div className="space-y-1 flex-1">
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">
                      {card.subtitle}
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}