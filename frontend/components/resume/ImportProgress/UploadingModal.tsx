"use client";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function UploadingModal() {
  const { l } = useLanguage();
  return (
    <>
      <Loader2 className="w-10 h-10 animate-spin text-yellow-600" />
      <h2 className="font-bold text-lg text-slate-900 dark:text-white">
        {l("Importation du CV...", "Uploading resume...")}
      </h2>
      <p className="text-slate-500 dark:text-[#a19f9d]">
        {l("Téléversement du document.", "Uploading document.")}
      </p>
    </>
  );
}
