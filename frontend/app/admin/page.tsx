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
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import { AdminService } from "@/services/admin.service";
import type { AdminUser } from "@/types/admin";
import type { UserStats } from "@/types/auth";
import Toast from "@/components/ui/toast/Toast";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/auth.store";

const LLM_ACTION_LABELS: Record<string, string> = {
  skill_validation: "Validation des compétences",
  job_offer_generation: "Génération d'offre d'emploi",
  identity_validation: "Validation d'identité",
  experience_validation: "Validation d'expérience",
  evaluation_validation: "Validation d'évaluation",
  education_validation: "Validation de formation",
  certification_validation: "Validation de certification",
  recruitment_email_generation: "Génération d'email de recrutement",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // Detail modal
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const currentUser = useAuthStore((s) => s.user);

  // Role change modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await AdminService.listUsers();
      setUsers(data);
    } catch {
      toast.error("Une erreur est servenue, veuillez ressayer!");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
      toast.error("Impossible de charger les statistiques");
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

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
      toast.success("Rôle mis à jour avec succès");
      setShowRoleModal(false);
    } catch (err: any) {
      setRoleError(
        err?.response?.data?.detail || "Échec de la mise à jour du rôle"
      );
    } finally {
      setIsSavingRole(false);
    }
  }, [selectedUser, newRole, toast]);

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Administration</h1>
              <p className="text-xs text-slate-500">Gestion des utilisateurs. Consultez la liste des recruteurs, leurs rôles et leur statut. Utilisez les actions pour <strong>activer</strong>, <strong>désactiver</strong> ou <strong>changer le rôle</strong> d&apos;un utilisateur.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              disabled={isLoading}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
            <NotificationButton />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-48" />
                      <div className="h-3 bg-slate-100 rounded w-64" />
                    </div>
                    <div className="h-8 bg-slate-100 rounded w-20" />
                    <div className="h-8 bg-slate-100 rounded w-20" />
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
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-16">
                  <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-sm text-slate-500">Aucun utilisateur trouvé</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => openDetailModal(user)}
                      className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {user.fullname}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="font-medium">{user.resume_count}</span>
                          <span className="text-slate-400 hidden sm:inline">CV importés</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Cpu className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-medium">{user.successful_llm_requests}</span>
                          <span className="text-slate-400 hidden sm:inline">Requêtes LLM</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden mm">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Détails de l'utilisateur</h3>
              <button
                onClick={closeDetailModal}
                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-start gap-4">
                {selectedUser.avatar ? (
                  <img
                    src={selectedUser.avatar}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <User className="w-7 h-7 text-slate-500" />
                  </div>
                )}
                <div>
                  <h4 className="text-base font-bold text-slate-900">{selectedUser.fullname}</h4>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium mm">
                      <Shield size={10} />
                      {selectedUser.role}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 mm font-medium ${
                      selectedUser.is_active
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                        : "bg-rose-50 border border-rose-200 text-rose-700"
                    }`}>
                      <BadgeCheck size={10} />
                      {selectedUser.is_active ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 bg-slate-50 mm">
                  <Mail size={14} className="shrink-0 text-slate-400" />
                  <span className="text-slate-700">{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 bg-slate-50 mm">
                  <Calendar size={14} className="shrink-0 text-slate-400" />
                  <span className="text-slate-700">Membre depuis {formatDate(selectedUser.created_at)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 px-3 py-3 border border-slate-100 bg-slate-50 mm">
                  <FileText size={18} className="shrink-0 text-blue-600" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 leading-tight">{userStats?.resume_count ?? selectedUser.resume_count}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">CV analysés</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-3 py-3 border border-slate-100 bg-slate-50 mm">
                  <Cpu size={18} className="shrink-0 text-purple-600" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 leading-tight">{userStats?.successful_llm_requests ?? selectedUser.successful_llm_requests}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">Requêtes LLM</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Cpu size={14} className="text-purple-600" />
                  Requêtes LLM par action
                </h4>
                {isLoadingStats ? (
                  <div className="flex justify-center py-6">
                    <Loader2 size={20} className="animate-spin text-slate-400" />
                  </div>
                ) : userStats ? (
                  <div className="border border-slate-100 overflow-hidden mm">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Action</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">Nombre de requêtes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userStats.llm_usage_by_action.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-3 py-4 text-center text-slate-400">Aucune requête LLM enregistrée</td>
                          </tr>
                        ) : (
                          userStats.llm_usage_by_action.map((row) => (
                            <tr key={row.action} className="border-b border-slate-50 last:border-b-0">
                              <td className="px-3 py-2 text-slate-700">{LLM_ACTION_LABELS[row.action] || row.action}</td>
                              <td className="px-3 py-2 text-right text-slate-900 font-medium">{row.count}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-100">
                          <td className="px-3 py-2 font-semibold text-slate-700">Total</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">{userStats.successful_llm_requests}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">Erreur de chargement</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              {currentUser && selectedUser.id !== currentUser.id && (
                <button
                  onClick={openRoleModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer mm flex items-center gap-1.5"
                >
                  <Shield size={13} />
                  Changer le rôle
                </button>
              )}
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer mm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white shadow-xl w-full max-w-md mm">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Modifier le rôle</h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 mm">
                <CircleAlert size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Êtes-vous sûr de vouloir modifier le rôle de <strong>{selectedUser.fullname}</strong> ?
                  Ce changement affectera ses permissions dans la plateforme.
                </p>
              </div>

              {roleError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 mm">
                  <CircleAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
                  <p className="text-xs text-rose-700">{roleError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nouveau rôle
                </label>
                <div className="relative">
                  <select
                    value={newRole}
                    onChange={(e) => {
                      setNewRole(e.target.value);
                      setRoleError(null);
                    }}
                    disabled={isSavingRole}
                    className="w-full appearance-none px-3 py-2 pr-8 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors mm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="admin">Administrateur</option>
                    <option value="recruiter">Recruteur</option>
                    <option value="employee">Employé</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setShowRoleModal(false)}
                disabled={isSavingRole}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer mm"
              >
                Annuler
              </button>
              <button
                onClick={handleRoleSave}
                disabled={isSavingRole || newRole === selectedUser.role}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mm flex items-center gap-1.5"
              >
                {isSavingRole ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
