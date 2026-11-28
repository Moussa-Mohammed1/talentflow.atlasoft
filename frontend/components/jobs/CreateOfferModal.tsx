"use client";

import { useState } from "react";
import { Loader, PenLine, Save, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { Department } from "@/types/department";
import type { EmploymentType, JobOfferStatus, SeniorityLevel, WorkMode } from "@/types/job-offers";
import type { JobOfferCreatePayload } from "@/services/job-offers.service";
import {
  employmentTypeLabelsByLang,
  seniorityLevelLabelsByLang,
  statusLabelsByLang,
  workModeLabelsByLang,
} from "./constants";

type CreateOfferMode = "ai" | "manual";

interface ManualOfferFormState {
  title: string;
  description: string;
  responsibilities: string;
  employment_type: EmploymentType;
  work_mode: WorkMode;
  seniority_level: SeniorityLevel;
  status: JobOfferStatus;
  openings: number;
  publish_date: string;
  closing_date: string;
  department_id: number | null;
}

const initialManualForm: ManualOfferFormState = {
  title: "",
  description: "",
  responsibilities: "",
  employment_type: "full_time",
  work_mode: "on_site",
  seniority_level: "mid",
  status: "published",
  openings: 1,
  publish_date: "",
  closing_date: "",
  department_id: null,
};

export function CreateOfferModal({
  description,
  departments,
  isSubmitting,
  onDescriptionChange,
  onSubmit,
  onCreateManual,
  onClose,
}: {
  description: string;
  departments: Department[];
  isSubmitting: boolean;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  onCreateManual: (payload: JobOfferCreatePayload) => void;
  onClose: () => void;
}) {
  const { language, t, l } = useLanguage();
  const [mode, setMode] = useState<CreateOfferMode>("ai");
  const [manualForm, setManualForm] = useState<ManualOfferFormState>(initialManualForm);

  const employmentTypeLabels = employmentTypeLabelsByLang[language];
  const workModeLabels = workModeLabelsByLang[language];
  const seniorityLevelLabels = seniorityLevelLabelsByLang[language];
  const statusLabels = statusLabelsByLang[language];

  const handleManualChange = <K extends keyof ManualOfferFormState>(
    field: K,
    value: ManualOfferFormState[K],
  ) => {
    setManualForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleManualSubmit = () => {
    const trimmedTitle = manualForm.title.trim();
    if (!trimmedTitle) return;

    onCreateManual({
      title: trimmedTitle,
      description: manualForm.description.trim() || null,
      responsibilities: manualForm.responsibilities.trim() || null,
      department_id: manualForm.department_id,
      employment_type: manualForm.employment_type,
      work_mode: manualForm.work_mode,
      seniority_level: manualForm.seniority_level,
      status: manualForm.status,
      openings: manualForm.openings,
      publish_date: manualForm.publish_date || null,
      closing_date: manualForm.closing_date || null,
    });
  };

  const isSubmitDisabled =
    isSubmitting || (mode === "ai" ? !description.trim() : !manualForm.title.trim());

  const inputClass =
    "w-full border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-2 text-sm text-gray-900 dark:text-[#f3f2f1] placeholder-gray-400 dark:placeholder-[#8a8886] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";
  const labelClass = "block text-xs font-semibold text-gray-700 dark:text-[#d2d0ce] mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 dark:bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full ${
          mode === "manual" ? "max-w-2xl" : "max-w-md"
        } max-h-[90vh] flex flex-col overflow-hidden mrc border border-gray-200/80 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xl transition-[max-width] duration-200`}
      >
        <div className="border-b border-gray-100 dark:border-[#3b3a39] px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[#f3f2f1]">
              {l("Nouvelle offre d'emploi", "New job offer")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#a19f9d] mt-0.5">
              {mode === "ai"
                ? l("Générez une offre à partir d'une description", "Generate an offer from a description")
                : l("Remplissez manuellement les détails de l'offre", "Fill in the job offer details manually")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-[#f3f2f1] p-1 hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 dark:border-[#3b3a39] px-6 py-3 bg-gray-50/50 dark:bg-[#1b1a19]/60 shrink-0">
          <div
            role="tablist"
            aria-label={l("Méthode de création", "Creation method")}
            className="grid grid-cols-2 gap-1 p-1 bg-gray-100 dark:bg-[#1b1a19] border border-gray-200 dark:border-[#3b3a39] rounded-[2px]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "ai"}
              disabled={isSubmitting}
              onClick={() => setMode("ai")}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors cursor-pointer disabled:opacity-50 ${
                mode === "ai"
                  ? "bg-white dark:bg-[#252423] text-gray-900 dark:text-[#f3f2f1] shadow-xs border border-gray-200/80 dark:border-[#3b3a39]"
                  : "text-gray-600 dark:text-[#a19f9d] hover:text-gray-900 dark:hover:text-[#f3f2f1]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#0078d4] dark:text-[#2899f5]" />
              {l("Générer avec l'IA", "Generate with AI")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "manual"}
              disabled={isSubmitting}
              onClick={() => setMode("manual")}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors cursor-pointer disabled:opacity-50 ${
                mode === "manual"
                  ? "bg-white dark:bg-[#252423] text-gray-900 dark:text-[#f3f2f1] shadow-xs border border-gray-200/80 dark:border-[#3b3a39]"
                  : "text-gray-600 dark:text-[#a19f9d] hover:text-gray-900 dark:hover:text-[#f3f2f1]"
              }`}
            >
              <PenLine className="h-3.5 w-3.5" />
              {l("Créer manuellement", "Create manually")}
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto [scrollbar-width:none]">
          {mode === "ai" ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="job-description" className={labelClass}>
                  {l("Description du poste", "Job description")}
                </label>
                <textarea
                  id="job-description"
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder={l("Entrez la description du poste ici...", "Paste or enter the job description here...")}
                  rows={6}
                  className={`${inputClass} resize-none`}
                />
                <p className="text-xs text-gray-400 dark:text-[#a19f9d] mt-1.5">
                  {l(
                    "Veuillez entrer la description du poste, le système gérera les détails du poste en utilisant l'intelligence artificielle.",
                    "Enter the job description and the system will automatically structure the job details using AI."
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="manual-title" className={labelClass}>
                    {l("Titre", "Title")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="manual-title"
                    type="text"
                    value={manualForm.title}
                    onChange={(e) => handleManualChange("title", e.target.value)}
                    placeholder={l("Ex : Développeur Full-Stack Senior", "e.g. Senior Full-Stack Developer")}
                    maxLength={255}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="manual-employment-type" className={labelClass}>
                    {l("Type d'emploi", "Employment type")}
                  </label>
                  <select
                    id="manual-employment-type"
                    value={manualForm.employment_type}
                    onChange={(e) => handleManualChange("employment_type", e.target.value as EmploymentType)}
                    className={inputClass}
                  >
                    {Object.entries(employmentTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="manual-work-mode" className={labelClass}>
                    {l("Mode de travail", "Work mode")}
                  </label>
                  <select
                    id="manual-work-mode"
                    value={manualForm.work_mode}
                    onChange={(e) => handleManualChange("work_mode", e.target.value as WorkMode)}
                    className={inputClass}
                  >
                    {Object.entries(workModeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="manual-seniority" className={labelClass}>
                    {l("Niveau hiérarchique", "Seniority level")}
                  </label>
                  <select
                    id="manual-seniority"
                    value={manualForm.seniority_level}
                    onChange={(e) => handleManualChange("seniority_level", e.target.value as SeniorityLevel)}
                    className={inputClass}
                  >
                    {Object.entries(seniorityLevelLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="manual-openings" className={labelClass}>
                    {l("Nombre de postes", "Openings")}
                  </label>
                  <input
                    id="manual-openings"
                    type="number"
                    min={1}
                    value={manualForm.openings}
                    onChange={(e) => handleManualChange("openings", Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="manual-status" className={labelClass}>
                    {l("Statut", "Status")}
                  </label>
                  <select
                    id="manual-status"
                    value={manualForm.status}
                    onChange={(e) => handleManualChange("status", e.target.value as JobOfferStatus)}
                    className={inputClass}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="manual-department" className={labelClass}>
                    {l("Département", "Department")}
                  </label>
                  <select
                    id="manual-department"
                    value={manualForm.department_id ?? ""}
                    onChange={(e) =>
                      handleManualChange("department_id", e.target.value ? parseInt(e.target.value, 10) : null)
                    }
                    className={inputClass}
                  >
                    <option value="">{t.common.none}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="manual-publish-date" className={labelClass}>
                    {l("Date de publication", "Publish date")}
                  </label>
                  <input
                    id="manual-publish-date"
                    type="date"
                    value={manualForm.publish_date}
                    onChange={(e) => handleManualChange("publish_date", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="manual-closing-date" className={labelClass}>
                    {l("Date de clôture", "Closing date")}
                  </label>
                  <input
                    id="manual-closing-date"
                    type="date"
                    value={manualForm.closing_date}
                    onChange={(e) => handleManualChange("closing_date", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="manual-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="manual-description"
                  rows={4}
                  value={manualForm.description}
                  onChange={(e) => handleManualChange("description", e.target.value)}
                  placeholder={l("Décrivez le poste et le profil recherché...", "Describe the role and candidate profile...")}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label htmlFor="manual-responsibilities" className={labelClass}>
                  {l("Responsabilités", "Responsibilities")}
                </label>
                <textarea
                  id="manual-responsibilities"
                  rows={3}
                  value={manualForm.responsibilities}
                  onChange={(e) => handleManualChange("responsibilities", e.target.value)}
                  placeholder={l("Listez les principales responsabilités...", "List key responsibilities...")}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-[#3b3a39] bg-gray-50/70 dark:bg-[#1b1a19] px-6 py-4 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={mode === "ai" ? onSubmit : handleManualSubmit}
            disabled={isSubmitDisabled}
            className="inline-flex items-center gap-2 bg-[#0078d4] border border-[#0078d4] text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-[#106ebe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === "ai"
              ? isSubmitting
                ? l("Génération...", "Generating...")
                : l("Enregistrer l'offre", "Save offer")
              : isSubmitting
                ? l("Création...", "Creating...")
                : l("Créer l'offre", "Create offer")}
          </button>
        </div>
      </div>
    </div>
  );
}
