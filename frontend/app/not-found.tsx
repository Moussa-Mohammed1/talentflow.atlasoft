"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function NotFound() {
  const { l } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50/40 to-white dark:from-[#1b1a19] dark:to-[#141414] px-4 text-center">
      <div className="max-w-md">
        <img
          src="/static/404.svg"
          alt="404 illustration"
          className="mx-auto w-2/5 max-w-sm"
        />

        <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          {l("Page introuvable", "Page not found")}
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-500 dark:text-[#a19f9d]">
          {l(
            "Désolé, nous n'avons pas trouvé la page que vous recherchez. Elle a peut-être été supprimée, renommée ou n'existe pas.",
            "Sorry, we couldn't find the page you're looking for. It might have been removed, renamed, or doesn't exist."
          )}
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-950 dark:bg-[#0078d4] px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:hover:bg-[#106ebe]"
        >
          <Home size={18} />
          {l("Retour à l'accueil", "Back to home")}
        </Link>
      </div>
    </div>
  );
}
