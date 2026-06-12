"use client";

import { useState } from 'react';
import { 
  Briefcase, 
  BarChart2, 
  Bell, 
  ArrowRight,
} from 'lucide-react';
import Sidebar from '@/components/layouts/Sidebar';

export default function Dashboard() {
  
  const cardsData = [
  {
    title: "Gestion des talents",
    buttonText: "Accéder",
    subtitle: "Consulter et gérer les profils talents",
    description:
      "Explorez les profils des candidats, leurs compétences, expériences, évaluations et disponibilités afin d'identifier les meilleurs talents.",
    illustration: null
  },
  {
    title: "Analyse & Statistiques",
    buttonText: "Voir",
    subtitle: "Suivre les indicateurs clés de recrutement",
    description:
      "Visualisez les performances du recrutement grâce à des tableaux de bord, des statistiques détaillées et des indicateurs de suivi des talents.",
    illustration: (
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
        <BarChart2 size={32} />
      </div>
    )
  },
  {
    title: "Documents & Ressources",
    buttonText: "Accéder",
    subtitle: "Centraliser les ressources et documents",
    description:
      "Retrouvez les CV, rapports d'évaluation et autres documents nécessaires à la gestion des talents et des recrutements.",
    illustration: null
  }
];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-slate-200">
      
      <Sidebar/>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        
        <header className="bg-slate-50 px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-slate-900">Accueil</h1>
          <button className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-full shadow-sm transition-all">
            <Bell size={16} />
          </button>
        </header>

        {/* --- CARDS GRID (Gaps shrunk from 6 to 4, max-width tightened) --- */}
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

                {/* Card Content & Illustration Layout (Text size shifted down to text-xs/text-[11px]) */}
                <div className="flex gap-4 items-start flex-1">
                  {card.illustration && (
                    <div className="hidden sm:block flex-shrink-0">
                      {card.illustration}
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