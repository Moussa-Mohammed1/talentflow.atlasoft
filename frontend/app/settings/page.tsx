"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  CircleAlert,
  Mail,
  Shield,
  Calendar,
  BadgeCheck,
  Bell,
  LucideSend,
  Lock,
  Save,
  Moon,
  Globe,
  List,
  LogOut,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import { AuthService } from "@/services/auth.service";
import { SettingsService, type NotificationPreferences, type UIPreferences } from "@/services/settings.service";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/hooks/useToast";

type Tab = "notifications" | "security" | "invitations";

const tabs: { key: Tab; label: string; icon: typeof Bell | typeof Lock }[] = [
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Sécurité", icon: Lock },
];

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

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? "bg-blue-800" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("notifications");
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Notification state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [uiPrefs, setUIPrefs] = useState<UIPreferences | null>(null);
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoadingUser(true);
      AuthService.me()
        .then((data) => setUser(data.user))
        .catch(() => router.push("/login"))
        .finally(() => setIsLoadingUser(false));
    }
  }, [user, setUser, router]);

  useEffect(() => {
    if (user && !notifPrefs) {
      setIsLoadingSettings(true);
      SettingsService.get()
        .then((settings) => {
          setNotifPrefs(settings.notification_preferences);
          setUIPrefs(settings.preferences);
        })
        .catch(() => toast.error("Impossible de charger les paramètres"))
        .finally(() => setIsLoadingSettings(false));
    }
  }, [user, notifPrefs, toast]);

  // --- Notification handlers ---
  const handleToggleNotif = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      if (!notifPrefs) return;
      setNotifPrefs({ ...notifPrefs, [key]: value });
    },
    [notifPrefs]
  );

  const handleSaveNotifications = useCallback(async () => {
    if (!notifPrefs || !uiPrefs) return;
    setIsSavingNotif(true);
    try {
      const result = await SettingsService.update({
        notification_preferences: notifPrefs,
        preferences: uiPrefs,
      });
      setNotifPrefs(result.notification_preferences);
      setUIPrefs(result.preferences);
      toast.success("Préférences enregistrées");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSavingNotif(false);
    }
  }, [notifPrefs, uiPrefs, toast]);

  // --- Security handlers ---
  const handlePasswordSave = useCallback(async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError("Les deux champs sont requis.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }
    setIsSavingPassword(true);
    setPasswordError(null);
    try {
      const response = await AuthService.updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setUser(response.user);
      toast.success("Mot de passe mis à jour");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(
        err?.response?.data?.detail || "Échec de la mise à jour du mot de passe"
      );
    } finally {
      setIsSavingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword, setUser, toast]);

  if (isLoadingUser || !user) {
    return (
      <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-slate-50 px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-slate-900">Paramètres</h1>
          <NotificationButton />
        </header>

        <main className="flex-1 px-6 pb-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                      isActive
                        ? "border-blue-800 text-blue-800"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab: Notifications */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-100 mrc p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-blue-50 mm">
                      <Bell size={16} className="text-blue-800" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Notifications par e-mail
                      </h3>
                      <p className="text-xs text-slate-500">
                        Choisissez les notifications que vous souhaitez recevoir
                      </p>
                    </div>
                  </div>

                  {isLoadingSettings ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-slate-400" />
                    </div>
                  ) : notifPrefs ? (
                    <div className="divide-y divide-slate-100">
                      <Toggle
                        checked={notifPrefs.email_new_candidate}
                        onChange={(v) => handleToggleNotif("email_new_candidate", v)}
                        label="Nouveau candidat"
                        description="Recevoir un e-mail quand un nouveau CV est importé et analysé"
                      />
                      <Toggle
                        checked={notifPrefs.email_invitation_accepted}
                        onChange={(v) => handleToggleNotif("email_invitation_accepted", v)}
                        label="Invitation acceptée"
                        description="Recevoir un e-mail quand un recruteur invité rejoint la plateforme"
                      />
                      <Toggle
                        checked={notifPrefs.email_system_updates}
                        onChange={(v) => handleToggleNotif("email_system_updates", v)}
                        label="Mises à jour système"
                        description="Recevoir des notifications sur les mises à jour et maintenances"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">
                      Erreur de chargement des préférences
                    </p>
                  )}
                </div>

               

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotifications}
                    disabled={isSavingNotif || !notifPrefs || !uiPrefs}
                    className="px-5 py-2.5 bg-blue-800 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 mm"
                  >
                    {isSavingNotif ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Enregistrer les préférences
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Security */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-100 mrc p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-amber-50 mm">
                      <Lock size={16} className="text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Changer le mot de passe
                      </h3>
                      <p className="text-xs text-slate-500">
                        Assurez la sécurité de votre compte en utilisant un mot de passe fort
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Mot de passe actuel
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Entrez votre mot de passe actuel"
                        className="w-full px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm mm"
                        disabled={isSavingPassword}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Nouveau mot de passe
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Au moins 8 caractères"
                        className="w-full px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm mm"
                        disabled={isSavingPassword}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Confirmer le mot de passe
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirmez votre nouveau mot de passe"
                        className="w-full px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm mm"
                        disabled={isSavingPassword}
                      />
                    </div>
                    {passwordError && (
                      <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 mm">
                        <CircleAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
                        <p className="text-xs text-rose-700">{passwordError}</p>
                      </div>
                    )}
                    {user.must_change_password && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 mm">
                        <CircleAlert size={14} className="shrink-0 mt-0.5 text-amber-500" />
                        <p className="text-xs text-amber-700">
                          Vous devez changer votre mot de passe après votre première connexion.
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button
                        onClick={handlePasswordSave}
                        disabled={isSavingPassword || !currentPassword || !newPassword}
                        className="px-5 py-2.5 bg-blue-800 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 mm"
                      >
                        {isSavingPassword ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Mettre à jour le mot de passe
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account info */}
                <div className="bg-white border border-slate-100 mrc p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-slate-50 mm">
                      <Shield size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Détails du compte
                      </h3>
                      <p className="text-xs text-slate-500">
                        Informations générales sur votre compte
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Rôle
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 bg-slate-50 text-sm text-slate-700 mm">
                        <Shield size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate capitalize">{user.role}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Statut
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 bg-slate-50 text-sm text-slate-700 mm">
                        <BadgeCheck size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate">{user.is_active ? "Actif" : "Inactif"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Email vérifié
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 bg-slate-50 text-sm text-slate-700 mm">
                        <Mail size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate">{user.email_verified ? "Oui" : "Non"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Membre depuis
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 bg-slate-50 text-sm text-slate-700 mm">
                        <Calendar size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate">{formatDate(user.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="bg-white border border-rose-200 mrc p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-rose-50 mm">
                      <LogOut size={16} className="text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose-900">Zone dangereuse</h3>
                      <p className="text-xs text-rose-600">
                        Actions irréversibles sur votre compte
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Déconnexion
                      </p>
                      <p className="text-xs text-slate-500">
                        Déconnectez-vous de tous les appareils
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await AuthService.logout();
                        useAuthStore.getState().logout();
                        router.push("/login");
                      }}
                      className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-medium transition-colors cursor-pointer mm flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      Se déconnecter
                    </button>
                  </div>

                  <div className="border-t border-rose-100 my-2" />

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Supprimer le compte
                      </p>
                      <p className="text-xs text-slate-500">
                        Supprime définitivement votre compte et toutes vos données
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDeleteConfirmText("");
                        setDeleteError(null);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors cursor-pointer mm flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white mrc shadow-xl w-full max-w-md mx-4 p-6 select-none">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-rose-50 rounded-full shrink-0">
                <TriangleAlert size={20} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Supprimer le compte
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 mm mb-4">
              <p className="text-xs text-rose-700 leading-relaxed">
                La suppression de votre compte entraînera la perte définitive de toutes vos données, y compris vos CV analysés, évaluations, talents, recrutements, et toutes autres informations associées à votre compte.
              </p>
            </div>

            {deleteError && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 mm mb-4">
                <CircleAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
                <p className="text-xs text-rose-700">{deleteError}</p>
              </div>
            )}

            <p className="text-xs text-slate-600 mb-2">
              Tapez <span className="font-semibold text-slate-900">supprimer mon compte</span> pour confirmer.
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError(null);
              }}
              placeholder="supprimer mon compte"
              disabled={isDeleting}
              className="w-full px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors text-sm mm mb-4"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }
              }}
            />

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer mm"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmText !== "supprimer mon compte") {
                    setDeleteError("Veuillez taper exactement « supprimer mon compte » pour confirmer.");
                    return;
                  }
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    await AuthService.deleteAccount();
                    useAuthStore.getState().logout();
                    router.push("/login");
                  } catch (err: any) {
                    setDeleteError(
                      err?.response?.data?.detail || "Échec de la suppression du compte"
                    );
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting || deleteConfirmText !== "supprimer mon compte"}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mm flex items-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Supprimer mon compte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
