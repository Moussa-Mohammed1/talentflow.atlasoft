"use client";

import { useRouter } from 'next/navigation';
import AppShell from '@/components/layouts/AppShell';
import { AtlasoftResourcesIcon } from '@/components/layouts/AtlasoftIcons';
import { useLanguage } from '@/context/LanguageContext';

export default function ResourcesPage() {
  const router = useRouter();
  const { t, l } = useLanguage();

  const resources = [
    {
      title: t.nav.departments,
      subtitle: l("Gérer les départements de l'entreprise", "Manage company departments"),
      description: l(
        "Consultez et gérez les départements, leurs compétences requises et les configurations associées.",
        "View and manage departments, their required skills, and associated settings."
      ),
      illustration: "/static/resources/departements.svg",
      href: "/resources/departements",
    },
  ];

  return (
    <AppShell
      title={t.nav.resources}
      icon={<AtlasoftResourcesIcon size={22} />}
      breadcrumbs={[{ label: t.nav.home, href: "/dashboard" }, { label: t.nav.resources }]}
      backgroundClassName="bg-[#f3f2f1]"
    >
      <main className="flex-1 px-6 py-8">
        <p className="text-sm text-slate-600 dark:text-[#c8c6c4] mb-6">
          {l(
            "Accédez aux ressources de configuration de la plateforme. Gérez les départements, leurs compétences requises et les seuils d'expérience pour affiner les évaluations des candidats.",
            "Access platform configuration resources. Manage departments, required skills, and experience thresholds to refine candidate evaluations."
          )}
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto">
          {resources.map((resource, index) => (
            <div
              key={index}
              onClick={() => router.push(resource.href)}
              className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-4 flex flex-col justify-between min-h-[180px] cursor-pointer hover:border-indigo-200 dark:hover:border-[#0078d4] hover:shadow-sm transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-sm font-bold text-indigo-900 dark:text-[#4ea8ff]">{resource.title}</h2>
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
                  <h3 className="text-xs font-bold text-slate-900 dark:text-[#f3f2f1] leading-tight">
                    {resource.subtitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#a19f9d] leading-relaxed">
                    {resource.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
