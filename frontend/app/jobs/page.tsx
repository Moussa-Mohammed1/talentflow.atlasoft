"use client";

import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import { Construction } from "lucide-react";

export default function JobsPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h1 className="text-lg font-bold text-slate-900">Offres d&apos;emploi</h1>
          <NotificationButton />
        </header>

        <main className="flex-1 px-6 max-w-7xl mx-auto w-full">
          <div className="flex flex-col items-center justify-center mrc border border-slate-100 bg-white py-24 px-4 text-center shadow-xs mt-6">
            <div className="flex h-16 w-16 items-center justify-center mrc bg-amber-50 text-amber-500 mb-6">
              <Construction className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Page en développement
            </h2>
            <p className="text-sm text-slate-500 max-w-md leading-relaxed">
              Cette page est actuellement en cours de développement. Une fois
              terminée, elle récupérera automatiquement les offres d&apos;emploi
              publiées sur LinkedIn.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
