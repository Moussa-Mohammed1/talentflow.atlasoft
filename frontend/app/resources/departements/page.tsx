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
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftDepartmentsIcon } from "@/components/layouts/AtlasoftIcons";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/context/LanguageContext";
import { DepartmentService } from "@/services/department.service";
import type { Department, DepartmentUpdateRequest } from "@/types/department";

function formatDate(dateStr: string | null, locale: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
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
  const { locale, t, l } = useLanguage();

  const loadDepartments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await DepartmentService.list();
      setDepartments(data);
    } catch {
      toast.error(l("Impossible de charger les départements", "Unable to load departments"));
    } finally {
      setIsLoading(false);
    }
  }, [l, toast]);

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

  const metrics = useMemo(() => ({ total: departments.length }), [departments]);

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setSortBy("name");
  }, []);

  const hasFilters = searchQuery || sortBy !== "name";

  const handleOpenCreate = useCallback(() => {
    setEditingDept(null);
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
          toast.success(l("Département mis à jour avec succès", "Department updated successfully"));
        } else {
          await DepartmentService.create({
            name,
            required_exp_years: requiredExpYears,
            required_skills: requiredSkills || undefined,
          });
          toast.success(l("Département créé avec succès", "Department created successfully"));
        }
        handleCloseModal();
        loadDepartments();
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        toast.error(detail || l("Une erreur est survenue", "An error occurred"));
      }
    },
    [editingDept, handleCloseModal, loadDepartments, toast, l]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await DepartmentService.delete(id);
        setDepartments((prev) => prev.filter((d) => d.id !== id));
        toast.success(l("Département supprimé avec succès", "Department deleted successfully"));
      } catch {
        toast.error(l("Impossible de supprimer le département", "Failed to delete department"));
      } finally {
        setDeleteConfirmId(null);
      }
    },
    [toast, l]
  );

  const formatYears = (years: number) =>
    l(`${years} an${years > 1 ? "s" : ""}`, `${years} yr${years > 1 ? "s" : ""}`);

  return (
    <AppShell
      title={t.nav.departments}
      icon={<AtlasoftDepartmentsIcon size={22} />}
      breadcrumbs={[
        { label: t.nav.home, href: "/dashboard" },
        { label: t.nav.resources, href: "/resources" },
        { label: t.nav.departments },
      ]}
      backgroundClassName="bg-[#f3f2f1]"
      headerActions={
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 rounded-[2px] border border-[#0078d4] bg-[#0078d4] px-3.5 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-[#106ebe] font-atlasoft"
        >
          <Plus className="h-4 w-4" />
          <span className="not-lg:hidden">{l("Nouveau département", "New department")}</span>
        </button>
      }
    >
      <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
        <p className="text-sm text-slate-600 dark:text-[#c8c6c4]">
          {l(
            "Gérez les départements de l'entreprise. Pour chaque département, renseignez les compétences requises et le nombre d'années d'expérience nécessaire. Cliquez sur un département pour voir ses détails, le modifier ou le supprimer.",
            "Manage company departments. Configure required skills and minimum years of experience for each department. Click any department to view details, edit, or delete it."
          )}
        </p>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-600 dark:text-[#c8c6c4]">
          <div>
            <span className="font-medium">Total:</span>{" "}
            <span className="font-semibold text-slate-900 dark:text-[#f3f2f1]">{metrics.total}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 mrc border border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423] p-3 shadow-xs md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 h-full w-6" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={l("Rechercher par nom...", "Search by name...")}
              className="w-full border border-slate-200 dark:border-[#3b3a39] bg-transparent dark:bg-[#1b1a19] py-1.5 pl-9 pr-4 text-sm text-slate-900 dark:text-[#f3f2f1] placeholder-slate-400 dark:placeholder-[#8a8886] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "recent")}
              className="border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-[#d2d0ce] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="name">{l("Par nom", "By name")}</option>
              <option value="recent">{l("Plus récents", "Newest first")}</option>
            </select>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#f3f2f1] hover:bg-slate-50 dark:hover:bg-[#323130] border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] transition-colors"
                title={l("Réinitialiser les filtres", "Reset filters")}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-4 shadow-xs animate-pulse flex items-center">
                <div className="h-4 bg-slate-100 dark:bg-[#323130] w-48" />
              </div>
            ))}
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="flex flex-col items-center justify-center mrc border border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423] py-16 px-4 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center mrc bg-blue-50 dark:bg-[#0078d4]/20 text-blue-600 dark:text-[#4ea8ff] mb-4">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-[#f3f2f1]">
              {searchQuery
                ? l("Aucun département trouvé", "No departments found")
                : l("Aucun département pour le moment", "No departments yet")}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-[#a19f9d]">
              {searchQuery
                ? l("Modifiez vos critères de recherche ou créez un nouveau département.", "Adjust your search or create a new department.")
                : l("Créez votre premier département pour commencer à organiser votre structure.", "Create your first department to start organizing your teams.")}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenCreate}
                className="mt-6 inline-flex items-center justify-center gap-2 border border-[#0078d4] bg-[#0078d4] px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-[#106ebe] transition-colors"
              >
                <Plus className="h-4 w-4" />
                {l("Nouveau département", "New department")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-hidden mrc border border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-500 dark:text-[#a19f9d]">
                  <thead className="bg-slate-50/70 dark:bg-[#1b1a19] text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#a19f9d] border-b border-slate-100 dark:border-[#3b3a39]">
                    <tr>
                      <th className="px-6 py-3.5">{l("Nom", "Name")}</th>
                      <th className="px-6 py-3.5">{l("Exp. requise (ans)", "Req. exp. (yrs)")}</th>
                      <th className="px-6 py-3.5">{l("Compétences requises", "Required skills")}</th>
                      <th className="px-6 py-3.5">{l("Date de création", "Created on")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#3b3a39]">
                    {filteredDepartments.map((dept) => (
                      <tr
                        key={dept.id}
                        onClick={() => setDetailDept(dept)}
                        className="hover:bg-slate-50/40 dark:hover:bg-[#323130] transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900 dark:text-[#f3f2f1]">{dept.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#c8c6c4]">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                            {formatYears(dept.required_exp_years)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {dept.required_skills && dept.required_skills.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {dept.required_skills.slice(0, 3).map((skill) => (
                                <span
                                  key={skill}
                                  className="inline-flex items-center rounded-xs bg-slate-100 dark:bg-[#1b1a19] border border-transparent dark:border-[#3b3a39] px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-[#d2d0ce]"
                                >
                                  {skill}
                                </span>
                              ))}
                              {dept.required_skills.length > 3 && (
                                <span className="inline-flex items-center rounded-md bg-slate-50 dark:bg-[#1b1a19] px-2 py-0.5 text-xs font-medium text-slate-400 border border-slate-200 dark:border-[#3b3a39]">
                                  +{dept.required_skills.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-[#605e5c]">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(dept.created_at, locale)}
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
                  className="mrc border border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423] p-4 shadow-xs space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-[#f3f2f1] truncate">
                      {dept.name}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-xs border-t border-slate-100 dark:border-[#3b3a39] pt-2 text-slate-500 dark:text-[#a19f9d]">
                    <div>
                      <span className="text-slate-400">{l("Exp. requise :", "Req. exp.:")}</span>{" "}
                      {formatYears(dept.required_exp_years)}
                    </div>
                    <div>
                      <span className="text-slate-400">{l("Créé le :", "Created:")}</span>{" "}
                      {formatDate(dept.created_at, locale)}
                    </div>
                  </div>
                  {dept.required_skills && dept.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-slate-50 dark:border-[#3b3a39] pt-2">
                      {dept.required_skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center rounded-md bg-slate-100 dark:bg-[#1b1a19] px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-[#d2d0ce]"
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
    </AppShell>
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
  const { t, l } = useLanguage();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 dark:bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg overflow-hidden mrc border border-gray-200/80 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xl">
        <div className="border-b border-gray-100 dark:border-[#3b3a39] px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-[#f3f2f1]">
            {department ? l("Modifier le département", "Edit department") : l("Nouveau département", "New department")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-[#f3f2f1] p-1 hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#d2d0ce] mb-1.5">
                {l("Nom du département", "Department name")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={l("Ex: Ingénierie, Marketing, RH...", "e.g. Engineering, Marketing, HR...")}
                className="w-full border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-2 text-sm text-gray-900 dark:text-[#f3f2f1] placeholder-gray-400 dark:placeholder-[#8a8886] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#d2d0ce] mb-1.5">
                {l("Années d'expérience requises", "Required years of experience")}
              </label>
              <input
                type="number"
                min={0}
                value={requiredExpYears}
                onChange={(e) => setRequiredExpYears(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-2 text-sm text-gray-900 dark:text-[#f3f2f1] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#d2d0ce] mb-1.5">
                {l("Compétences requises", "Required skills")}
              </label>
              <input
                type="text"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                placeholder="Python+React+SQL"
                className="w-full border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-2 text-sm text-gray-900 dark:text-[#f3f2f1] placeholder-gray-400 dark:placeholder-[#8a8886] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              <p className="text-xs text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-md px-2 py-1.5 mt-2">
                {l("Séparez chaque compétence par le symbole + (ex: Python+React+SQL)", "Separate each skill with + (e.g. Python+React+SQL)")}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-[#3b3a39] bg-gray-50/70 dark:bg-[#1b1a19] px-6 py-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors disabled:opacity-50"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 bg-[#0078d4] border border-[#0078d4] text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-[#106ebe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? l("Enregistrement...", "Saving...") : department ? t.common.save : t.common.create}
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
  const { locale, t, l } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 dark:bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-x-hidden border border-gray-200/80 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 dark:border-[#3b3a39] px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-[#f3f2f1]">{department.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-[#f3f2f1] p-1 hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#a19f9d] mb-1">
                {l("Expérience requise", "Required experience")}
              </label>
              <p className="text-sm text-gray-900 dark:text-[#f3f2f1]">
                {l(
                  `${department.required_exp_years} an${department.required_exp_years > 1 ? "s" : ""}`,
                  `${department.required_exp_years} year${department.required_exp_years > 1 ? "s" : ""}`
                )}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#a19f9d] mb-1">
                {l("Date de création", "Created on")}
              </label>
              <p className="text-sm text-gray-900 dark:text-[#f3f2f1]">{formatDate(department.created_at, locale)}</p>
            </div>
          </div>

          {department.required_skills && department.required_skills.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#a19f9d] mb-1.5">
                {l("Compétences requises", "Required skills")}
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-80 overflow-y-scroll [scrollbar-width:none]">
                {department.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-xs bg-slate-100 dark:bg-[#1b1a19] border border-transparent dark:border-[#3b3a39] px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-[#d2d0ce]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-[#3b3a39] bg-gray-50/70 dark:bg-[#1b1a19] px-6 py-4 flex items-center justify-end gap-2">
          {deleteConfirmId === department.id ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors"
              >
                {l("Confirmer la suppression", "Confirm deletion")}
              </button>
              <button
                onClick={onCancelDelete}
                className="border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#d2d0ce] hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
              >
                {t.common.cancel}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onEdit(department)}
                className="inline-flex items-center gap-2 border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-black dark:text-[#f3f2f1] shadow-xs hover:bg-black hover:text-white dark:hover:bg-[#0078d4] dark:hover:border-[#0078d4] transition-colors"
              >
                <Pencil className="h-4 w-4" />
                {t.common.edit}
              </button>
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-2 border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-black dark:text-[#f3f2f1] shadow-xs hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                {t.common.delete}
              </button>
              <button
                onClick={onClose}
                className="border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
              >
                {t.common.close}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
