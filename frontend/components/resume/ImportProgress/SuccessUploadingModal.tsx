"use client";
import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function SuccessUploadingModal() {
  const { l } = useLanguage();
  return (
    <>
      <CheckCircle2 className="w-10 h-10 text-green-600" />
      <h2 className="font-bold text-lg text-slate-900 dark:text-white">
        {l("CV importé avec succès", "Resume uploaded successfully")}
      </h2>
      <p className="text-slate-500 dark:text-[#a19f9d]">
        {l("Préparation de l'analyse...", "Preparing analysis...")}
      </p>
    </>
  );
}
