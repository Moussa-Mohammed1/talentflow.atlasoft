"use client";

import { Loader, Save, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function CreateOfferModal({
  description,
  isSubmitting,
  onDescriptionChange,
  onSubmit,
  onClose,
}: {
  description: string;
  isSubmitting: boolean;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const { t, l } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 dark:bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden mrc border border-gray-200/80 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xl">
        <div className="border-b border-gray-100 dark:border-[#3b3a39] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[#f3f2f1]">
              {l("Nouvelle offre d'emploi", "New job offer")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#a19f9d] mt-0.5">
              {l("Générez une offre à partir d'une description", "Generate an offer from a description")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-[#f3f2f1] p-1 hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="job-description"
              className="block text-xs font-semibold text-gray-700 dark:text-[#d2d0ce] mb-1.5"
            >
              {l("Description du poste", "Job description")}
            </label>
            <textarea
              id="job-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={l("Entrez la description du poste ici...", "Paste or enter the job description here...")}
              rows={6}
              className="w-full border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-2 text-sm text-gray-900 dark:text-[#f3f2f1] placeholder-gray-400 dark:placeholder-[#8a8886] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 dark:text-[#a19f9d] mt-1.5">
              {l(
                "Veuillez entrer la description du poste, le système gérera les détails du poste en utilisant l'intelligence artificielle.",
                "Enter the job description and the system will automatically structure the job details using AI."
              )}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-[#3b3a39] bg-gray-50/70 dark:bg-[#1b1a19] px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!description.trim() || isSubmitting}
            className="inline-flex items-center gap-2 bg-[#0078d4] border border-[#0078d4] text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-[#106ebe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSubmitting
              ? l("Génération...", "Generating...")
              : l("Enregistrer l'offre", "Save offer")}
          </button>
        </div>
      </div>
    </div>
  );
}
