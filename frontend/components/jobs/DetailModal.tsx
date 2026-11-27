"use client";

import { useState } from "react";
import { Briefcase, Edit3, Loader, MapPin, Save, Trash2, Users, X } from "lucide-react";
import { jobOffersService } from "@/services/job-offers.service";
import type { Department } from "@/types/department";
import type { JobOffer } from "@/types/job-offers";
import { useLanguage } from "@/context/LanguageContext";
import {
  employmentTypeLabelsByLang,
  formatDate,
  formatDateInput,
  seniorityLevelLabelsByLang,
  statusColors,
  statusLabelsByLang,
  workModeLabelsByLang,
} from "./constants";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { useToast } from "@/hooks/useToast";

export function DetailModal({
  offer,
  departments,
  onClose,
  onSaved,
  onDeleted,
}: {
  offer: JobOffer;
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { language, locale, t, l } = useLanguage();
  const employmentTypeLabels = employmentTypeLabelsByLang[language];
  const workModeLabels = workModeLabelsByLang[language];
  const seniorityLevelLabels = seniorityLevelLabelsByLang[language];
  const statusLabels = statusLabelsByLang[language];

  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState({
    title: offer.title,
    description: offer.description ?? "",
    responsibilities: offer.responsibilities ?? "",
    employment_type: offer.employment_type,
    work_mode: offer.work_mode,
    seniority_level: offer.seniority_level,
    status: offer.status,
    openings: offer.openings,
    publish_date: formatDateInput(offer.publish_date),
    closing_date: formatDateInput(offer.closing_date),
    department_id: offer.department_id,
  });

  const handleChange = (field: string, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await jobOffersService.update(offer.id, {
        title: form.title,
        description: form.description || null,
        responsibilities: form.responsibilities || null,
        employment_type: form.employment_type,
        work_mode: form.work_mode,
        seniority_level: form.seniority_level,
        status: form.status,
        openings: form.openings,
        publish_date: form.publish_date || null,
        closing_date: form.closing_date || null,
        department_id: form.department_id,
      });
      setIsEditMode(false);
      onSaved();
    } catch (error) {
      console.error("Failed to update job offer:", error);
    } finally {
      setIsSaving(false);
    }
  };
  const toast = useToast();
  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      toast.success(l("Suppression en cours", "Deleting..."));
      await jobOffersService.delete(offer.id);
      toast.success(l("Supprimée avec succès", "Deleted successfully"));
      onDeleted();
    } catch (error) {
      console.error("Failed to delete job offer:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClass =
    "w-full border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-2 text-sm text-gray-900 dark:text-[#f3f2f1] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";
  const labelClass = "block text-xs font-semibold text-gray-700 dark:text-[#a19f9d] mb-1";
  const readValueClass = "text-sm text-gray-900 dark:text-[#f3f2f1] leading-relaxed";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 dark:bg-black/60 backdrop-blur-xs">
        <div className="w-full max-w-2xl max-h-[90vh] [scrollbar-width:none] overflow-y-auto mrc border border-gray-200/80 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xl">
          <div className="border-b border-gray-100 dark:border-[#3b3a39] px-6 py-4 flex items-center justify-between sticky top-0 bg-white dark:bg-[#252423] z-10">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-[#f3f2f1]">
                {isEditMode ? l("Modifier l'offre", "Edit offer") : l("Détails de l'offre", "Offer details")}
              </h3>
              <span className={`inline-flex items-center gap-1 mm px-2 py-0.5 text-[11px] font-medium ${statusColors[offer.status]}`}>
                {statusLabels[offer.status]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="inline-flex items-center gap-1.5 border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
                >
                  <Edit3 size={13} />
                  {t.common.edit}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-[#f3f2f1] p-1 hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                {isEditMode ? (
                  <div>
                    <label className={labelClass}>{l("Titre", "Title")}</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <div>
                    <span className={labelClass}>{l("Titre", "Title")}</span>
                    <p className={readValueClass}>{offer.title}</p>
                  </div>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <div>
                    <label className={labelClass}>{l("Type d'emploi", "Employment type")}</label>
                    <select
                      value={form.employment_type}
                      onChange={(e) => handleChange("employment_type", e.target.value)}
                      className={inputClass}
                    >
                      {Object.entries(employmentTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <span className={labelClass}>{l("Type d'emploi", "Employment type")}</span>
                    <p className={readValueClass}>
                      <Briefcase size={13} className="inline mr-1 text-slate-400" />
                      {employmentTypeLabels[offer.employment_type]}
                    </p>
                  </div>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <div>
                    <label className={labelClass}>{l("Mode de travail", "Work mode")}</label>
                    <select
                      value={form.work_mode}
                      onChange={(e) => handleChange("work_mode", e.target.value)}
                      className={inputClass}
                    >
                      {Object.entries(workModeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <span className={labelClass}>{l("Mode de travail", "Work mode")}</span>
                    <p className={readValueClass}>
                      <MapPin size={13} className="inline mr-1 text-slate-400" />
                      {workModeLabels[offer.work_mode]}
                    </p>
                  </div>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <div>
                    <label className={labelClass}>{l("Niveau hiérarchique", "Seniority level")}</label>
                    <select
                      value={form.seniority_level}
                      onChange={(e) => handleChange("seniority_level", e.target.value)}
                      className={inputClass}
                    >
                      {Object.entries(seniorityLevelLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <span className={labelClass}>{l("Niveau hiérarchique", "Seniority level")}</span>
                    <p className={readValueClass}>
                      <Users size={13} className="inline mr-1 text-slate-400" />
                      {seniorityLevelLabels[offer.seniority_level]}
                    </p>
                  </div>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <div>
                    <label className={labelClass}>{l("Nombre de postes", "Openings")}</label>
                    <input
                      type="number"
                      min={1}
                      value={form.openings}
                      onChange={(e) => handleChange("openings", parseInt(e.target.value) || 1)}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <div>
                    <span className={labelClass}>{l("Nombre de postes", "Openings")}</span>
                    <p className={readValueClass}>{offer.openings}</p>
                  </div>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <div>
                    <label className={labelClass}>{l("Statut", "Status")}</label>
                    <select
                      value={form.status}
                      onChange={(e) => handleChange("status", e.target.value)}
                      className={inputClass}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <span className={labelClass}>{l("Statut", "Status")}</span>
                    <p className={readValueClass}>{statusLabels[offer.status]}</p>
                  </div>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <div>
                    <label className={labelClass}>{l("Département", "Department")}</label>
                    <select
                      value={form.department_id ?? ""}
                      onChange={(e) => handleChange("department_id", e.target.value ? parseInt(e.target.value) : null)}
                      className={inputClass}
                    >
                      <option value="">{t.common.none}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <span className={labelClass}>{l("Département", "Department")}</span>
                    <p className={readValueClass}>
                      {offer.department_id
                        ? departments.find((d) => d.id === offer.department_id)?.name ?? `#${offer.department_id}`
                        : "—"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <div>
                    <label className={labelClass}>{l("Date de publication", "Publish date")}</label>
                    <input
                      type="date"
                      value={form.publish_date}
                      onChange={(e) => handleChange("publish_date", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <div>
                    <span className={labelClass}>{l("Date de publication", "Publish date")}</span>
                    <p className={readValueClass}>{formatDate(offer.publish_date, locale) ?? "—"}</p>
                  </div>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <div>
                    <label className={labelClass}>{l("Date de clôture", "Closing date")}</label>
                    <input
                      type="date"
                      value={form.closing_date}
                      onChange={(e) => handleChange("closing_date", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <div>
                    <span className={labelClass}>{l("Date de clôture", "Closing date")}</span>
                    <p className={readValueClass}>{formatDate(offer.closing_date, locale) ?? "—"}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              {isEditMode ? (
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    className={inputClass + " resize-none"}
                  />
                </div>
              ) : (
                <div>
                  <span className={labelClass}>Description</span>
                  <p className={readValueClass}>{offer.description ?? "—"}</p>
                </div>
              )}
            </div>

            <div>
              {isEditMode ? (
                <div>
                  <label className={labelClass}>{l("Responsabilités", "Responsibilities")}</label>
                  <textarea
                    rows={3}
                    value={form.responsibilities}
                    onChange={(e) => handleChange("responsibilities", e.target.value)}
                    className={inputClass + " resize-none"}
                  />
                </div>
              ) : (
                <div>
                  <span className={labelClass}>{l("Responsabilités", "Responsibilities")}</span>
                  <p className={readValueClass}>{offer.responsibilities ?? "—"}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-[#3b3a39] bg-gray-50/70 dark:bg-[#1b1a19] px-6 py-4 flex items-center justify-between">
            <div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 border border-red-200 dark:border-rose-800 bg-white dark:bg-[#252423] px-3 py-2 text-xs font-medium text-red-600 dark:text-rose-400 shadow-xs hover:bg-red-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 size={13} />
                  {t.common.delete}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
              >
                {t.common.close}
              </button>
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !form.title.trim()}
                  className="inline-flex items-center gap-2 bg-black dark:bg-[#0078d4] text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-gray-800 dark:hover:bg-[#106ebe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t.common.save}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmModal
          title={offer.title}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
