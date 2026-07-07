import { useState } from "react";
import { Briefcase, Edit3, Loader, MapPin, Save, Trash2, Users, X } from "lucide-react";
import { jobOffersService } from "@/services/job-offers.service";
import type { Department } from "@/types/department";
import type { JobOffer } from "@/types/job-offers";
import {
  employmentTypeLabels,
  formatDate,
  formatDateInput,
  seniorityLevelLabels,
  statusColors,
  statusLabels,
  workModeLabels,
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
  const toast = useToast()
  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      toast.success("Suppression en cours")
      await jobOffersService.delete(offer.id);
      toast.success("Supprimée avec success");
      onDeleted();
    } catch (error) {
      console.error("Failed to delete job offer:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClass = "w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";
  const labelClass = "block text-xs font-semibold text-gray-700 mb-1";
  const readValueClass = "text-sm text-gray-900 leading-relaxed";

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] [scrollbar-width:none] overflow-y-auto mrc border border-gray-200/80 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">
              {isEditMode ? "Modifier l'offre" : "Détails de l'offre"}
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium ${statusColors[offer.status]}`}>
              {statusLabels[offer.status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode && (
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
              >
                <Edit3 size={13} />
                Modifier
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 transition-colors"
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
                  <label className={labelClass}>Titre</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    className={inputClass}
                  />
                </div>
              ) : (
                <div>
                  <span className={labelClass}>Titre</span>
                  <p className={readValueClass}>{offer.title}</p>
                </div>
              )}
            </div>

            <div>
              {isEditMode ? (
                <div>
                  <label className={labelClass}>Type d&apos;emploi</label>
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
                  <span className={labelClass}>Type d&apos;emploi</span>
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
                  <label className={labelClass}>Mode de travail</label>
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
                  <span className={labelClass}>Mode de travail</span>
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
                  <label className={labelClass}>Niveau hiérarchique</label>
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
                  <span className={labelClass}>Niveau hiérarchique</span>
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
                  <label className={labelClass}>Nombre de postes</label>
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
                  <span className={labelClass}>Nombre de postes</span>
                  <p className={readValueClass}>{offer.openings}</p>
                </div>
              )}
            </div>

            <div>
              {isEditMode ? (
                <div>
                  <label className={labelClass}>Statut</label>
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
                  <span className={labelClass}>Statut</span>
                  <p className={readValueClass}>{statusLabels[offer.status]}</p>
                </div>
              )}
            </div>

            <div>
              {isEditMode ? (
                <div>
                  <label className={labelClass}>Département</label>
                  <select
                    value={form.department_id ?? ""}
                    onChange={(e) => handleChange("department_id", e.target.value ? parseInt(e.target.value) : null)}
                    className={inputClass}
                  >
                    <option value="">Aucun</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <span className={labelClass}>Département</span>
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
                  <label className={labelClass}>Date de publication</label>
                  <input
                    type="date"
                    value={form.publish_date}
                    onChange={(e) => handleChange("publish_date", e.target.value)}
                    className={inputClass}
                  />
                </div>
              ) : (
                <div>
                  <span className={labelClass}>Date de publication</span>
                  <p className={readValueClass}>{formatDate(offer.publish_date) ?? "—"}</p>
                </div>
              )}
            </div>

            <div>
              {isEditMode ? (
                <div>
                  <label className={labelClass}>Date de clôture</label>
                  <input
                    type="date"
                    value={form.closing_date}
                    onChange={(e) => handleChange("closing_date", e.target.value)}
                    className={inputClass}
                  />
                </div>
              ) : (
                <div>
                  <span className={labelClass}>Date de clôture</span>
                  <p className={readValueClass}>{formatDate(offer.closing_date) ?? "—"}</p>
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
                <label className={labelClass}>Responsabilités</label>
                <textarea
                  rows={3}
                  value={form.responsibilities}
                  onChange={(e) => handleChange("responsibilities", e.target.value)}
                  className={inputClass + " resize-none"}
                />
              </div>
            ) : (
              <div>
                <span className={labelClass}>Responsabilités</span>
                <p className={readValueClass}>{offer.responsibilities ?? "—"}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4 flex items-center justify-between">
          <div>
            {isEditMode && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 shadow-xs hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} />
                Supprimer
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !form.title.trim()}
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
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


