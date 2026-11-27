"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  Shield,
  RefreshCw,
  User,
  FileText,
  Cpu,
  X,
  Loader2,
  CheckCircle2,
  CircleAlert,
  ChevronDown,
  Calendar,
  BadgeCheck,
  Mail,
} from "lucide-react";
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftAdminUsersIcon } from "@/components/layouts/AtlasoftIcons";
import { AdminService } from "@/services/admin.service";
import type { AdminUser } from "@/types/admin";
import type { UserStats } from "@/types/auth";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/auth.store";
import { useLanguage } from "@/context/LanguageContext";
import { resolveMediaUrl } from "@/lib/media";

function formatDate(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

export default function AdminUsersPage() {
  const { locale, t, l } = useLanguage();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const currentUser = useAuthStore((s) => s.user);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const llmActionLabels: Record<string, string> = {
    skill_validation: l("Validation des compétences", "Skill validation"),
    job_offer_generation: l("Génération d'offre d'emploi", "Job offer generation"),
    identity_validation: l("Validation d'identité", "Identity validation"),
    experience_validation: l("Validation d'expérience", "Experience validation"),
    evaluation_validation: l("Validation d'évaluation", "Evaluation validation"),
    education_validation: l("Validation de formation", "Education validation"),
    certification_validation: l("Validation de certification", "Certification validation"),
    recruitment_email_generation: l("Génération d'email de recrutement", "Recruitment email generation"),
  };

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await AdminService.listUsers();
      setUsers(data);
    } catch {
      toast.error(l("Une erreur est survenue, veuillez réessayer !", "An error occurred, please try again!"));
    } finally {
      setIsLoading(false);
    }
  }, [l, toast]);

  useEffect(() => {
    let active = true;
    AdminService.listUsers()
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch(() => {
        if (active) {
          toast.error(l("Une erreur est survenue, veuillez réessayer !", "An error occurred, please try again!"));
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [l, toast]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.fullname.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const openDetailModal = useCallback(async (user: AdminUser) => {
    setSelectedUser(user);
    setIsLoadingStats(true);
    setUserStats(null);
    try {
      const stats = await AdminService.getUserStats(user.id);
      setUserStats(stats);
    } catch {
      toast.error(l("Impossible de charger les statistiques", "Unable to load statistics"));
    } finally {
      setIsLoadingStats(false);
    }
  }, [l, toast]);

  const closeDetailModal = useCallback(() => {
    setSelectedUser(null);
    setUserStats(null);
  }, []);

  const openRoleModal = useCallback(() => {
    if (!selectedUser) return;
    setNewRole(selectedUser.role);
    setRoleError(null);
    setShowRoleModal(true);
  }, [selectedUser]);

  const handleRoleSave = useCallback(async () => {
    if (!selectedUser || !newRole || newRole === selectedUser.role) {
      setShowRoleModal(false);
      return;
    }
    setIsSavingRole(true);
    setRoleError(null);
    try {
      const result = await AdminService.updateUserRole(selectedUser.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? result.user : u))
      );
      setSelectedUser(result.user);
      toast.success(l("Rôle mis à jour avec succès", "Role updated successfully"));
      setShowRoleModal(false);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setRoleError(
        detail || l("Échec de la mise à jour du rôle", "Failed to update role")
      );
    } finally {
      setIsSavingRole(false);
    }
  }, [selectedUser, newRole, toast, l]);

  return (
    <AppShell
      title={t.nav.admin}
      subtitle={l(
        "Gestion des utilisateurs. Consultez la liste des recruteurs, leurs rôles et leur statut. Utilisez les actions pour activer, désactiver ou changer le rôle d'un utilisateur.",
        "User management. Browse recruiters, inspect their roles and activity stats, and update user roles."
      )}
      icon={<AtlasoftAdminUsersIcon size={22} />}
      breadcrumbs={[{ label: t.nav.home, href: "/dashboard" }, { label: t.nav.admin }]}
      backgroundClassName="bg-[#f3f2f1]"
      headerActions={
        <button
          onClick={loadUsers}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-[2px] border border-[#8a8886] dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-3 py-1.5 text-[12.5px] font-medium text-[#323130] dark:text-[#f3f2f1] hover:bg-[#f3f2f1] dark:hover:bg-[#323130] transition-colors cursor-pointer disabled:opacity-50 font-atlasoft"
          title={t.common.refresh}
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin text-[#0078d4]" : "text-[#0078d4]"} />
          <span>{t.common.refresh}</span>
        </button>
      }
    >
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#252423] rounded-xl border border-slate-200 dark:border-[#3b3a39] p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#323130]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-[#323130] rounded w-48" />
                    <div className="h-3 bg-slate-100 dark:bg-[#1b1a19] rounded w-64" />
                  </div>
                  <div className="h-8 bg-slate-100 dark:bg-[#1b1a19] rounded w-20" />
                  <div className="h-8 bg-slate-100 dark:bg-[#1b1a19] rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={l("Rechercher par nom ou email...", "Search by name or email...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] text-slate-900 dark:text-[#f3f2f1] placeholder:text-slate-400 dark:placeholder:text-[#8a8886] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-16">
                <User className="w-12 h-12 text-slate-300 dark:text-[#605e5c] mx-auto mb-4" />
                <p className="text-sm text-slate-500 dark:text-[#a19f9d]">
                  {l("Aucun utilisateur trouvé", "No users found")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => openDetailModal(user)}
                    className="bg-white dark:bg-[#252423] rounded-xl border border-slate-200 dark:border-[#3b3a39] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-indigo-200 dark:hover:border-[#0078d4] hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {resolveMediaUrl(user.avatar) ? (
                        <img
                          src={resolveMediaUrl(user.avatar) || undefined}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#323130] flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-500 dark:text-[#a19f9d]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-[#f3f2f1] truncate">
                          {user.fullname}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#a19f9d] truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#c8c6c4]">
                        <FileText className="w-4 h-4 text-blue-500 dark:text-[#4ea8ff] shrink-0" />
                        <span className="font-medium">{user.resume_count}</span>
                        <span className="text-slate-400 dark:text-[#8a8886] hidden sm:inline">
                          {l("CV importés", "Resumes imported")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#c8c6c4]">
                        <Cpu className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        <span className="font-medium">{user.successful_llm_requests}</span>
                        <span className="text-slate-400 dark:text-[#8a8886] hidden sm:inline">
                          {l("Requêtes LLM", "LLM requests")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#252423] border border-transparent dark:border-[#3b3a39] shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden mm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#3b3a39] flex justify-between items-center bg-slate-50 dark:bg-[#1b1a19]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1]">
                {l("Détails de l'utilisateur", "User details")}
              </h3>
              <button
                onClick={closeDetailModal}
                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-[#323130] text-slate-400 hover:text-slate-600 dark:hover:text-[#f3f2f1] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-start gap-4">
                {resolveMediaUrl(selectedUser.avatar) ? (
                  <img
                    src={resolveMediaUrl(selectedUser.avatar) || undefined}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-[#323130] flex items-center justify-center shrink-0">
                    <User className="w-7 h-7 text-slate-500 dark:text-[#a19f9d]" />
                  </div>
                )}
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-[#f3f2f1]">{selectedUser.fullname}</h4>
                  <p className="text-sm text-slate-500 dark:text-[#a19f9d]">{selectedUser.email}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-[#0078d4]/20 border border-indigo-200 dark:border-[#2899f5]/40 text-indigo-700 dark:text-[#4ea8ff] font-medium mm">
                      <Shield size={10} />
                      {selectedUser.role}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 mm font-medium ${
                      selectedUser.is_active
                        ? "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400"
                    }`}>
                      <BadgeCheck size={10} />
                      {selectedUser.is_active ? t.common.active : t.common.inactive}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] mm">
                  <Mail size={14} className="shrink-0 text-slate-400" />
                  <span className="text-slate-700 dark:text-[#d2d0ce]">{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] mm">
                  <Calendar size={14} className="shrink-0 text-slate-400" />
                  <span className="text-slate-700 dark:text-[#d2d0ce]">
                    {l("Membre depuis", "Member since")} {formatDate(selectedUser.created_at, locale)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 px-3 py-3 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] mm">
                  <FileText size={18} className="shrink-0 text-blue-600 dark:text-[#4ea8ff]" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-[#f3f2f1] leading-tight">{userStats?.resume_count ?? selectedUser.resume_count}</p>
                    <p className="text-[10px] text-slate-500 dark:text-[#a19f9d] leading-tight">
                      {l("CV analysés", "Parsed resumes")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-3 py-3 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] mm">
                  <Cpu size={18} className="shrink-0 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-[#f3f2f1] leading-tight">{userStats?.successful_llm_requests ?? selectedUser.successful_llm_requests}</p>
                    <p className="text-[10px] text-slate-500 dark:text-[#a19f9d] leading-tight">
                      {l("Requêtes LLM", "LLM requests")}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-[#d2d0ce] mb-2 flex items-center gap-1.5">
                  <Cpu size={14} className="text-purple-600 dark:text-purple-400" />
                  {l("Requêtes LLM par action", "LLM requests by action")}
                </h4>
                {isLoadingStats ? (
                  <div className="flex justify-center py-6">
                    <Loader2 size={20} className="animate-spin text-slate-400" />
                  </div>
                ) : userStats ? (
                  <div className="border border-slate-100 dark:border-[#3b3a39] overflow-hidden mm">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#1b1a19] border-b border-slate-100 dark:border-[#3b3a39]">
                          <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-[#c8c6c4]">Action</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-[#c8c6c4]">
                            {l("Nombre de requêtes", "Request count")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {userStats.llm_usage_by_action.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-3 py-4 text-center text-slate-400">
                              {l("Aucune requête LLM enregistrée", "No LLM requests recorded")}
                            </td>
                          </tr>
                        ) : (
                          userStats.llm_usage_by_action.map((row) => (
                            <tr key={row.action} className="border-b border-slate-50 dark:border-[#323130] last:border-b-0">
                              <td className="px-3 py-2 text-slate-700 dark:text-[#d2d0ce]">{llmActionLabels[row.action] || row.action}</td>
                              <td className="px-3 py-2 text-right text-slate-900 dark:text-[#f3f2f1] font-medium">{row.count}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 dark:bg-[#1b1a19] border-t border-slate-100 dark:border-[#3b3a39]">
                          <td className="px-3 py-2 font-semibold text-slate-700 dark:text-[#d2d0ce]">Total</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-[#f3f2f1]">{userStats.successful_llm_requests}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">{l("Erreur de chargement", "Failed to load")}</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] flex justify-end gap-2">
              {currentUser && selectedUser.id !== currentUser.id && (
                <button
                  onClick={openRoleModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#0078d4] dark:hover:bg-[#106ebe] text-white text-xs font-semibold transition-colors cursor-pointer mm flex items-center gap-1.5"
                >
                  <Shield size={13} />
                  {l("Changer le rôle", "Change role")}
                </button>
              )}
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 border border-slate-200 dark:border-[#3b3a39] text-slate-600 dark:text-[#d2d0ce] hover:bg-slate-100 dark:hover:bg-[#323130] text-xs font-medium transition-colors cursor-pointer mm"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-[#252423] border border-transparent dark:border-[#3b3a39] shadow-xl w-full max-w-md mm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#3b3a39] flex justify-between items-center bg-slate-50 dark:bg-[#1b1a19]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1]">
                {l("Modifier le rôle", "Edit role")}
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-[#323130] text-slate-400 hover:text-slate-600 dark:hover:text-[#f3f2f1] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 mm">
                <CircleAlert size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  {l(
                    `Êtes-vous sûr de vouloir modifier le rôle de ${selectedUser.fullname} ? Ce changement affectera ses permissions dans la plateforme.`,
                    `Are you sure you want to change ${selectedUser.fullname}'s role? This will update their permissions across the platform.`
                  )}
                </p>
              </div>

              {roleError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 mm">
                  <CircleAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
                  <p className="text-xs text-rose-700 dark:text-rose-300">{roleError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-[#d2d0ce] mb-1.5">
                  {l("Nouveau rôle", "New role")}
                </label>
                <div className="relative">
                  <select
                    value={newRole}
                    onChange={(e) => {
                      setNewRole(e.target.value);
                      setRoleError(null);
                    }}
                    disabled={isSavingRole}
                    className="w-full appearance-none px-3 py-2 pr-8 border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-[#f3f2f1] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors mm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="admin">{l("Administrateur", "Administrator")}</option>
                    <option value="recruiter">{l("Recruteur", "Recruiter")}</option>
                    <option value="employee">{l("Employé", "Employee")}</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] flex justify-end gap-2">
              <button
                onClick={() => setShowRoleModal(false)}
                disabled={isSavingRole}
                className="px-4 py-2 border border-slate-200 dark:border-[#3b3a39] text-slate-600 dark:text-[#d2d0ce] hover:bg-slate-100 dark:hover:bg-[#323130] text-xs font-medium transition-colors cursor-pointer mm"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleRoleSave}
                disabled={isSavingRole || newRole === selectedUser.role}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#0078d4] dark:hover:bg-[#106ebe] text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mm flex items-center gap-1.5"
              >
                {isSavingRole ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                {t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
