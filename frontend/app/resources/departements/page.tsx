"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Plus,
  Search,
  Building2,
  Pencil,
  Trash2,
  RefreshCw,
  Calendar,
  Briefcase,
  X,
} from "lucide-react";
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import { useToast } from "@/hooks/useToast";
import { DepartmentService } from "@/services/department.service";
import type { Department, DepartmentUpdateRequest } from "@/types/department";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DepartementsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "recent">("name");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [detailDept, setDetailDept] = useState<Department | null>(null);

  const toast = useToast();

  const loadDepartments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await DepartmentService.list();
      setDepartments(data);
    } catch {
      toast.error("Impossible de charger les départements");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const filteredDepartments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return departments
      .filter((d) => !query || d.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [departments, searchQuery, sortBy]);

  const metrics = useMemo(
    () => ({
      total: departments.length,
    }),
    [departments]
  );

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setSortBy("name");
  }, []);

  const hasFilters = searchQuery || sortBy !== "name";

  const handleOpenCreate = useCallback(() => {
    setEditingDept(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((dept: Department) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingDept(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDept(null);
    setDeleteConfirmId(null);
  }, []);

  const handleEditFromDetail = useCallback((dept: Department) => {
    setDetailDept(null);
    setEditingDept(dept);
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(
    async (name: string, requiredExpYears: number, requiredSkills: string) => {
      try {
        if (editingDept) {
          const payload: DepartmentUpdateRequest = {};
          if (name !== editingDept.name) payload.name = name;
          if (requiredExpYears !== editingDept.required_exp_years) payload.required_exp_years = requiredExpYears;
          payload.required_skills = requiredSkills;
          await DepartmentService.update(editingDept.id, payload);
          toast.success("Département mis à jour avec succès");
        } else {
          await DepartmentService.create({ name, required_exp_years: requiredExpYears, required_skills: requiredSkills || undefined });
          toast.success("Département créé avec succès");
        }
        handleCloseModal();
        loadDepartments();
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        toast.error(detail || "Une erreur est survenue");
      }
    },
    [editingDept, handleCloseModal, loadDepartments, toast]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await DepartmentService.delete(id);
        setDepartments((prev) => prev.filter((d) => d.id !== id));
        toast.success("Département supprimé avec succès");
      } catch {
        toast.error("Impossible de supprimer le département");
      } finally {
        setDeleteConfirmId(null);
      }
    },
    [toast]
  );

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h1 className="text-lg font-bold text-slate-900">Départements</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="flex  items-center justify-center gap-2 border bg-white px-4 py-2.5 text-sm not-lg:text-xs font-medium text-black shadow-xs transition-all hover:bg-black hover:text-white"
            >
              <Plus className="h-4 w-4" />
              <p className="not-lg:hidden ">Nouveau département</p>
            </button>
            <NotificationButton />
          </div>
        </header>

        <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          <p className="text-sm text-slate-600">Gérez les départements de l&apos;entreprise. Pour chaque département, renseignez les <strong>compétences requises</strong> et le nombre d&apos;<strong>années d&apos;expérience</strong> nécessaire. Utilisez la <strong>barre de recherche</strong> et le <strong>tri</strong> pour naviguer. Cliquez sur un département pour voir ses détails, le <strong>modifier</strong> ou le <strong>supprimer</strong>.</p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-600">
            <div>
              <span className="font-medium">Total:</span>{" "}
              <span className="font-semibold text-slate-900">{metrics.total}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mrc border border-slate-100 bg-white p-3 shadow-xs md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 h-full w-6" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom..."
                className="w-full border border-slate-200 bg-transparent py-1.5 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "recent")}
                className="border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="name">Par nom</option>
                <option value="recent">Plus récents</option>
              </select>
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200 bg-white transition-colors"
                  title="Réinitialiser les filtres"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-white border border-slate-100 mrc p-4 shadow-xs animate-pulse flex items-center">
                  <div className="h-4 bg-slate-100  w-48" />
                </div>
              ))}
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="flex flex-col items-center justify-center mrc border border-slate-100 bg-white py-16 px-4 text-center shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center mrc bg-blue-50 text-blue-600 mb-4">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                {searchQuery ? "Aucun département trouvé" : "Aucun département pour le moment"}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {searchQuery
                  ? "Modifiez vos critères de recherche ou créez un nouveau département."
                  : "Créez votre premier département pour commencer à organiser votre structure."}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleOpenCreate}
                  className="mt-6 inline-flex items-center justify-center gap-2 border bg-white px-4 py-2.5 text-sm font-medium text-black shadow-xs hover:bg-black hover:text-white transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nouveau département
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-hidden mrc border border-slate-100 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-500">
                    <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5">Nom</th>
                        <th className="px-6 py-3.5">Exp. requise (ans)</th>
                        <th className="px-6 py-3.5">Compétences requises</th>
                        <th className="px-6 py-3.5">Date de création</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDepartments.map((dept) => (
                        <tr
                          key={dept.id}
                          onClick={() => setDetailDept(dept)}
                          className="hover:bg-slate-50/40 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              
                              <span className="font-medium text-slate-900">{dept.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                              {dept.required_exp_years} an{dept.required_exp_years > 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {dept.required_skills && dept.required_skills.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {dept.required_skills.slice(0, 3).map((skill) => (
                                  <span
                                    key={skill}
                                    className="inline-flex items-center rounded-xs bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {dept.required_skills.length > 3 && (
                                  <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400 border border-slate-200">
                                    +{dept.required_skills.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(dept.created_at)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredDepartments.map((dept) => (
                  <div
                    key={dept.id}
                    onClick={() => setDetailDept(dept)}
                    className="mrc border border-slate-100 bg-white p-4 shadow-xs space-y-3 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">
                            {dept.name}
                          </h4>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 text-xs border-t border-slate-100 pt-2 text-slate-500">
                      <div>
                        <span className="text-slate-400">Exp. requise :</span>{" "}
                        {dept.required_exp_years} an{dept.required_exp_years > 1 ? "s" : ""}
                      </div>
                      <div>
                        <span className="text-slate-400">Créé le :</span>{" "}
                        {formatDate(dept.created_at)}
                      </div>
                    </div>
                    {dept.required_skills && dept.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 border-t border-slate-50 pt-2">
                        {dept.required_skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      <DepartmentModal
        isOpen={isModalOpen}
        department={editingDept}
        onClose={handleCloseModal}
        onSave={handleSave}
      />

      {detailDept && (
        <DepartmentDetailModal
          department={detailDept}
          onClose={handleCloseDetail}
          onEdit={handleEditFromDetail}
          onDelete={() => setDeleteConfirmId(detailDept.id)}
          deleteConfirmId={deleteConfirmId}
          onConfirmDelete={async () => {
            await handleDelete(detailDept.id);
            handleCloseDetail();
          }}
          onCancelDelete={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}

function DepartmentModal({
  isOpen,
  department,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  department: Department | null;
  onClose: () => void;
  onSave: (name: string, requiredExpYears: number, requiredSkills: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [requiredExpYears, setRequiredExpYears] = useState(0);
  const [requiredSkills, setRequiredSkills] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(department?.name || "");
      setRequiredExpYears(department?.required_exp_years ?? 0);
      setRequiredSkills(department?.required_skills?.join("+") || "");
    }
  }, [isOpen, department]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), requiredExpYears, requiredSkills.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg overflow-hidden mrc border border-gray-200/80 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {department ? "Modifier le département" : "Nouveau département"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Nom du département
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ingénierie, Marketing, RH..."
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Années d&apos;expérience requises
              </label>
              <input
                type="number"
                min={0}
                value={requiredExpYears}
                onChange={(e) => setRequiredExpYears(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Compétences requises
              </label>
              <input
                type="text"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                placeholder="Python+React+SQL"
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-2 py-1.5 mt-2">
                Séparez chaque compétence par le symbole <strong>+</strong> (ex: Python+React+SQL)
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 bg-white border text-black px-4 py-2 text-sm font-medium hover:text-white shadow-xs hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Enregistrement..." : department ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DepartmentDetailModal({
  department,
  onClose,
  onEdit,
  onDelete,
  deleteConfirmId,
  onConfirmDelete,
  onCancelDelete,
}: {
  department: Department;
  onClose: () => void;
  onEdit: (dept: Department) => void;
  onDelete: () => void;
  deleteConfirmId: number | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-x-hidden  border border-gray-200/80 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{department.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Expérience requise</label>
              <p className="text-sm text-gray-900">
                {department.required_exp_years} an{department.required_exp_years > 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date de création</label>
              <p className="text-sm text-gray-900">{formatDate(department.created_at)}</p>
            </div>
          </div>

          {department.required_skills && department.required_skills.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Compétences requises</label>
              <div className="flex flex-wrap gap-1.5 h-80 overflow-y-scroll">
                {department.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-xs bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4 flex items-center justify-end gap-2">
          {deleteConfirmId === department.id ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors"
              >
                Confirmer la suppression
              </button>
              <button
                onClick={onCancelDelete}
                className="border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onEdit(department)}
                className="inline-flex items-center gap-2 border bg-white px-4 py-2 text-sm font-medium text-black shadow-xs hover:bg-black hover:text-white transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-2 border bg-white px-4 py-2 text-sm font-medium text-black shadow-xs hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
              <button
                onClick={onClose}
                className="border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
