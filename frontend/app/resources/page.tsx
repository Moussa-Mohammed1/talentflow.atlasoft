"use client";

import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layouts/Sidebar';
import NotificationButton from '@/components/ui/NotificationButton';

const resources = [
  {
    title: "Départements",
    subtitle: "Gérer les départements de l'entreprise",
    description:
      "Consultez et gérez les départements, leurs compétences requises et les configurations associées.",
    illustration: "/static/resources/departements.svg",
    href: "/resources/departements",
  },
];

export default function ResourcesPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-slate-900">Resources</h1>
          <NotificationButton />
        </header>
        <main className="flex-1 px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {resources.map((resource, index) => (
              <div
                key={index}
                onClick={() => router.push(resource.href)}
                className="bg-white border border-slate-100 mrc p-4 flex flex-col justify-between min-h-[180px] cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-sm font-bold text-indigo-900">{resource.title}</h2>
                </div>
                <div className="flex gap-4 items-start flex-1">
                  {resource.illustration && (
                    <div className="hidden sm:block flex-shrink-0">
                      <img
                        src={resource.illustration}
                        alt={resource.title}
                        className="w-20 h-20 object-contain"
                      />
                    </div>
                  )}
                  <div className="space-y-1 flex-1">
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">
                      {resource.subtitle}
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {resource.description}
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
