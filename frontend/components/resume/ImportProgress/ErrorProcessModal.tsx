"use client";
import { XCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ErrorProcessModal({ message }: { message?: string | null }) {
  const { l } = useLanguage();
  return (
    <>
      <XCircle className="w-10 h-10 text-red-600" />
      <h2 className="font-bold text-lg text-slate-900 dark:text-white">
        {l("Une erreur est survenue", "An error occurred")}
      </h2>
      <p className="text-slate-500 dark:text-[#a19f9d]">
        {message || l("Impossible d'importer le CV.", "Unable to import the resume.")}
      </p>
    </>
  );
}
