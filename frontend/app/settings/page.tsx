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
  Lock,
  Save,
  Moon,
  Sun,
  Globe,
  LogOut,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftSettingsIcon } from "@/components/layouts/AtlasoftIcons";
import { AuthService } from "@/services/auth.service";
import { SettingsService, type NotificationPreferences, type UIPreferences } from "@/services/settings.service";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/hooks/useToast";
import { useTheme, type AppTheme } from "@/context/ThemeContext";
import { useLanguage, type AppLanguage } from "@/context/LanguageContext";

type Tab = "notifications" | "appearance" | "security";

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
        <p className="text-sm font-medium text-slate-900 dark:text-[#f3f2f1]">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 dark:text-[#a19f9d] mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? "bg-blue-800 dark:bg-[#0078d4]" : "bg-slate-200 dark:bg-[#3b3a39]"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-white shadow-sm ring-0 transition-transform ${
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
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, locale, t, l } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("notifications");
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSavingLang, setIsSavingLang] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(!user);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [uiPrefs, setUIPrefs] = useState<UIPreferences | null>(null);
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deletePhrase = l("supprimer mon compte", "delete my account");

  const tabs: { key: Tab; label: string; icon: typeof Bell }[] = [
    { key: "notifications", label: l("Notifications", "Notifications"), icon: Bell },
    { key: "appearance", label: l("Apparence & Langue", "Appearance & Language"), icon: Moon },
    { key: "security", label: l("Sécurité", "Security"), icon: Lock },
  ];

  useEffect(() => {
    if (!user) {
      AuthService.me()
        .then((data) => setUser(data.user))
        .catch(() => router.push("/login"))
        .finally(() => setIsLoadingUser(false));
    }
  }, [user, setUser, router]);

  useEffect(() => {
    if (user && !notifPrefs) {
      SettingsService.get()
        .then((settings) => {
          setNotifPrefs(settings.notification_preferences);
          setUIPrefs(settings.preferences);
        })
        .catch(() =>
          toast.error(l("Impossible de charger les paramètres", "Failed to load settings"))
        )
        .finally(() => setIsLoadingSettings(false));
    }
  }, [user, notifPrefs, toast, l]);

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
        preferences: { ...uiPrefs, theme, language },
      });
      setNotifPrefs(result.notification_preferences);
      setUIPrefs(result.preferences);
      toast.success(l("Préférences enregistrées", "Preferences saved"));
    } catch {
      toast.error(l("Erreur lors de l'enregistrement", "Failed to save preferences"));
    } finally {
      setIsSavingNotif(false);
    }
  }, [notifPrefs, uiPrefs, theme, language, toast, l]);

  const handleThemeSelect = useCallback(
    async (nextTheme: AppTheme) => {
      if (nextTheme === theme) return;
      setTheme(nextTheme);
      const nextUIPrefs: UIPreferences = {
        language,
        items_per_page: uiPrefs?.items_per_page ?? 10,
        theme: nextTheme,
      };
      setUIPrefs(nextUIPrefs);
      setIsSavingTheme(true);
      try {
        const result = await SettingsService.update({
          preferences: nextUIPrefs,
        });
        setUIPrefs(result.preferences);
        toast.success(
          nextTheme === "dark"
            ? l("Mode sombre activé", "Dark mode enabled")
            : l("Mode clair activé", "Light mode enabled")
        );
      } catch {
        toast.success(
          nextTheme === "dark"
            ? l("Mode sombre activé", "Dark mode enabled")
            : l("Mode clair activé", "Light mode enabled")
        );
      } finally {
        setIsSavingTheme(false);
      }
    },
    [setTheme, theme, language, toast, uiPrefs, l]
  );

  const handleLanguageSelect = useCallback(
    async (nextLang: AppLanguage) => {
      if (nextLang === language) return;
      setLanguage(nextLang);
      const nextUIPrefs: UIPreferences = {
        language: nextLang,
        items_per_page: uiPrefs?.items_per_page ?? 10,
        theme,
      };
      setUIPrefs(nextUIPrefs);
      setIsSavingLang(true);
      try {
        const result = await SettingsService.update({
          preferences: nextUIPrefs,
        });
        setUIPrefs(result.preferences);
        toast.success(
          nextLang === "en" ? "Language switched to English" : "Langue changée en Français"
        );
      } catch {
        toast.success(
          nextLang === "en" ? "Language switched to English" : "Langue changée en Français"
        );
      } finally {
        setIsSavingLang(false);
      }
    },
    [setLanguage, language, theme, toast, uiPrefs]
  );

  const handlePasswordSave = useCallback(async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError(l("Les deux champs sont requis.", "Both fields are required."));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(
        l(
          "Le mot de passe doit contenir au moins 8 caractères.",
          "Password must be at least 8 characters long."
        )
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(
        l("Les mots de passe ne correspondent pas.", "Passwords do not match.")
      );
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
      toast.success(l("Mot de passe mis à jour", "Password updated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPasswordError(
        detail || l("Échec de la mise à jour du mot de passe", "Failed to update password")
      );
    } finally {
      setIsSavingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword, setUser, toast, l]);

  if (isLoadingUser || !user) {
    return (
      <AppShell
        title={t.nav.settings}
        icon={<AtlasoftSettingsIcon size={22} />}
        breadcrumbs={[{ label: t.nav.home, href: "/dashboard" }, { label: t.nav.settings }]}
        backgroundClassName="bg-[#f3f2f1]"
      >
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#0078d4]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={t.nav.settings}
      icon={<AtlasoftSettingsIcon size={22} />}
      breadcrumbs={[{ label: t.nav.home, href: "/dashboard" }, { label: t.nav.settings }]}
      backgroundClassName="bg-[#f3f2f1]"
    >
      <main className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-slate-600 dark:text-[#c8c6c4] mb-6">
            {l(
              "Personnalisez vos préférences. Configurez les notifications par e-mail que vous souhaitez recevoir, modifiez votre mot de passe, et choisissez l'apparence et la langue de l'interface.",
              "Customize your preferences. Configure the email notifications you want to receive, update your password, and choose the interface appearance and language."
            )}
          </p>
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-[#3b3a39]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                      isActive
                        ? "border-blue-800 text-blue-800 dark:border-[#2899f5] dark:text-[#4ea8ff]"
                        : "border-transparent text-slate-500 dark:text-[#a19f9d] hover:text-slate-700 dark:hover:text-[#f3f2f1] hover:border-slate-300 dark:hover:border-[#605e5c]"
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
                <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-blue-50 dark:bg-[#0078d4]/20 mm">
                      <Bell size={16} className="text-blue-800 dark:text-[#4ea8ff]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1]">
                        {l("Notifications par e-mail", "Email notifications")}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#a19f9d]">
                        {l(
                          "Choisissez les notifications que vous souhaitez recevoir",
                          "Choose which notifications you would like to receive"
                        )}
                      </p>
                    </div>
                  </div>

                  {isLoadingSettings ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-slate-400" />
                    </div>
                  ) : notifPrefs ? (
                    <div className="divide-y divide-slate-100 dark:divide-[#3b3a39]">
                      <Toggle
                        checked={notifPrefs.email_new_candidate}
                        onChange={(v) => handleToggleNotif("email_new_candidate", v)}
                        label={l("Nouveau candidat", "New candidate")}
                        description={l(
                          "Recevoir un e-mail quand un nouveau CV est importé et analysé",
                          "Receive an email when a new resume is imported and analyzed"
                        )}
                      />
                      <Toggle
                        checked={notifPrefs.email_invitation_accepted}
                        onChange={(v) => handleToggleNotif("email_invitation_accepted", v)}
                        label={l("Invitation acceptée", "Invitation accepted")}
                        description={l(
                          "Recevoir un e-mail quand un recruteur invité rejoint la plateforme",
                          "Receive an email when an invited recruiter joins the platform"
                        )}
                      />
                      <Toggle
                        checked={notifPrefs.email_system_updates}
                        onChange={(v) => handleToggleNotif("email_system_updates", v)}
                        label={l("Mises à jour système", "System updates")}
                        description={l(
                          "Recevoir des notifications sur les mises à jour et maintenances",
                          "Receive notifications about updates and maintenance"
                        )}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-[#a19f9d] text-center py-4">
                      {l("Erreur de chargement des préférences", "Error loading preferences")}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotifications}
                    disabled={isSavingNotif || !notifPrefs || !uiPrefs}
                    className="px-5 py-2.5 bg-blue-800 hover:bg-blue-600 dark:bg-[#0078d4] dark:hover:bg-[#106ebe] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 mm"
                  >
                    {isSavingNotif ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    {l("Enregistrer les préférences", "Save preferences")}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Appearance & Language */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                {/* Theme section */}
                <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-6">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-[#0078d4]/20 mm">
                        {theme === "dark" ? (
                          <Moon size={16} className="text-blue-800 dark:text-[#4ea8ff]" />
                        ) : (
                          <Sun size={16} className="text-blue-800 dark:text-[#4ea8ff]" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1]">
                          {l("Thème de l'application", "Application theme")}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-[#a19f9d]">
                          {l(
                            "Choisissez le mode d'affichage appliqué à l'ensemble de la plateforme",
                            "Choose the display mode applied across the entire platform"
                          )}
                        </p>
                      </div>
                    </div>
                    {isSavingTheme && (
                      <Loader2 size={16} className="animate-spin text-[#0078d4] dark:text-[#4ea8ff]" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => void handleThemeSelect("light")}
                      aria-pressed={theme === "light"}
                      className={`group text-left rounded-[4px] border p-4 transition-all cursor-pointer ${
                        theme === "light"
                          ? "border-[#0078d4] bg-[#eff6fc] ring-1 ring-[#0078d4]"
                          : "border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] hover:border-slate-300 dark:hover:border-[#605e5c]"
                      }`}
                    >
                      <div className="mb-3 overflow-hidden rounded-[2px] border border-[#edebe9] bg-[#f3f2f1]">
                        <div className="flex h-3 items-center gap-1 bg-[#1b1a19] px-1.5">
                          <span className="h-1 w-3 rounded-full bg-white/70" />
                        </div>
                        <div className="flex h-12">
                          <div className="w-5 bg-[#252423]" />
                          <div className="flex-1 space-y-1.5 bg-white dark:bg-white p-2">
                            <div className="h-1.5 w-14 rounded-full bg-[#323130]" />
                            <div className="h-1.5 w-20 rounded-full bg-[#edebe9]" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sun size={15} className={theme === "light" ? "text-[#0078d4]" : "text-slate-500 dark:text-[#a19f9d]"} />
                          <span className={`text-sm font-semibold ${theme === "light" ? "text-[#0078d4]" : "text-slate-900 dark:text-[#f3f2f1]"}`}>
                            {l("Mode clair", "Light mode")}
                          </span>
                        </div>
                        {theme === "light" && (
                          <CheckCircle2 size={16} className="text-[#0078d4]" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-[#a19f9d]">
                        {l(
                          "Surface claire par défaut pour une lisibilité optimale de jour.",
                          "Default bright surface for optimal daytime readability."
                        )}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleThemeSelect("dark")}
                      aria-pressed={theme === "dark"}
                      className={`group text-left rounded-[4px] border p-4 transition-all cursor-pointer ${
                        theme === "dark"
                          ? "border-[#2899f5] bg-[#0078d4]/15 ring-1 ring-[#2899f5]"
                          : "border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] hover:border-slate-300 dark:hover:border-[#605e5c]"
                      }`}
                    >
                      <div className="mb-3 overflow-hidden rounded-[2px] border border-[#3b3a39] bg-[#141414]">
                        <div className="flex h-3 items-center gap-1 bg-[#1b1a19] px-1.5 border-b border-[#323130]">
                          <span className="h-1 w-3 rounded-full bg-white/70" />
                        </div>
                        <div className="flex h-12">
                          <div className="w-5 border-r border-[#323130] bg-[#252423]" />
                          <div className="flex-1 space-y-1.5 bg-[#1b1a19] p-2">
                            <div className="h-1.5 w-14 rounded-full bg-[#f3f2f1]" />
                            <div className="h-1.5 w-20 rounded-full bg-[#3b3a39]" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Moon size={15} className={theme === "dark" ? "text-[#4ea8ff]" : "text-slate-500 dark:text-[#a19f9d]"} />
                          <span className={`text-sm font-semibold ${theme === "dark" ? "text-[#4ea8ff]" : "text-slate-900 dark:text-[#f3f2f1]"}`}>
                            {l("Mode sombre", "Dark mode")}
                          </span>
                        </div>
                        {theme === "dark" && (
                          <CheckCircle2 size={16} className="text-[#4ea8ff]" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-[#a19f9d]">
                        {l(
                          "Interface sombre intégrale réduisant la fatigue visuelle.",
                          "Full dark interface reducing visual strain."
                        )}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Language section */}
                <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-6">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-[#0078d4]/20 mm">
                        <Globe size={16} className="text-blue-800 dark:text-[#4ea8ff]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1]">
                          {l("Langue de l'application", "Application language")}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-[#a19f9d]">
                          {l(
                            "Choisissez la langue d'affichage de toute la plateforme",
                            "Select the display language for the entire platform"
                          )}
                        </p>
                      </div>
                    </div>
                    {isSavingLang && (
                      <Loader2 size={16} className="animate-spin text-[#0078d4] dark:text-[#4ea8ff]" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => void handleLanguageSelect("fr")}
                      aria-pressed={language === "fr"}
                      className={`text-left rounded-[4px] border p-4 transition-all cursor-pointer ${
                        language === "fr"
                          ? "border-[#0078d4] bg-[#eff6fc] dark:border-[#2899f5] dark:bg-[#0078d4]/15 ring-1 ring-[#0078d4] dark:ring-[#2899f5]"
                          : "border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] hover:border-slate-300 dark:hover:border-[#605e5c]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-slate-100 dark:bg-[#323130] text-xs font-bold text-slate-700 dark:text-white">
                            FR
                          </span>
                          <span className={`text-sm font-semibold ${language === "fr" ? "text-[#0078d4] dark:text-[#4ea8ff]" : "text-slate-900 dark:text-[#f3f2f1]"}`}>
                            Français
                          </span>
                        </div>
                        {language === "fr" && (
                          <CheckCircle2 size={16} className="text-[#0078d4] dark:text-[#4ea8ff]" />
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-[#a19f9d]">
                        {l("Interface complète en français.", "Complete interface in French.")}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleLanguageSelect("en")}
                      aria-pressed={language === "en"}
                      className={`text-left rounded-[4px] border p-4 transition-all cursor-pointer ${
                        language === "en"
                          ? "border-[#0078d4] bg-[#eff6fc] dark:border-[#2899f5] dark:bg-[#0078d4]/15 ring-1 ring-[#0078d4] dark:ring-[#2899f5]"
                          : "border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] hover:border-slate-300 dark:hover:border-[#605e5c]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-slate-100 dark:bg-[#323130] text-xs font-bold text-slate-700 dark:text-white">
                            EN
                          </span>
                          <span className={`text-sm font-semibold ${language === "en" ? "text-[#0078d4] dark:text-[#4ea8ff]" : "text-slate-900 dark:text-[#f3f2f1]"}`}>
                            English
                          </span>
                        </div>
                        {language === "en" && (
                          <CheckCircle2 size={16} className="text-[#0078d4] dark:text-[#4ea8ff]" />
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-[#a19f9d]">
                        {l("Interface complète en anglais.", "Complete interface in English.")}
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Security */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 mm">
                      <Lock size={16} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1]">
                        {l("Changer le mot de passe", "Change password")}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#a19f9d]">
                        {l(
                          "Assurez la sécurité de votre compte en utilisant un mot de passe fort",
                          "Keep your account secure by using a strong password"
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-[#c8c6c4] mb-1.5">
                        {l("Mot de passe actuel", "Current password")}
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder={l("Entrez votre mot de passe actuel", "Enter your current password")}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-[#f3f2f1] placeholder:text-slate-400 dark:placeholder:text-[#8a8886] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm mm"
                        disabled={isSavingPassword}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-[#c8c6c4] mb-1.5">
                        {l("Nouveau mot de passe", "New password")}
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={l("Au moins 8 caractères", "At least 8 characters")}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-[#f3f2f1] placeholder:text-slate-400 dark:placeholder:text-[#8a8886] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm mm"
                        disabled={isSavingPassword}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-[#c8c6c4] mb-1.5">
                        {l("Confirmer le mot de passe", "Confirm password")}
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={l("Confirmez votre nouveau mot de passe", "Confirm your new password")}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-[#f3f2f1] placeholder:text-slate-400 dark:placeholder:text-[#8a8886] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm mm"
                        disabled={isSavingPassword}
                      />
                    </div>
                    {passwordError && (
                      <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 mm">
                        <CircleAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
                        <p className="text-xs text-rose-700 dark:text-rose-300">{passwordError}</p>
                      </div>
                    )}
                    {user.must_change_password && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 mm">
                        <CircleAlert size={14} className="shrink-0 mt-0.5 text-amber-500" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {l(
                            "Vous devez changer votre mot de passe après votre première connexion.",
                            "You must change your password after your first sign-in."
                          )}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button
                        onClick={handlePasswordSave}
                        disabled={isSavingPassword || !currentPassword || !newPassword}
                        className="px-5 py-2.5 bg-blue-800 hover:bg-blue-600 dark:bg-[#0078d4] dark:hover:bg-[#106ebe] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 mm"
                      >
                        {isSavingPassword ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        {l("Mettre à jour le mot de passe", "Update password")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account info */}
                <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-slate-50 dark:bg-[#323130] mm">
                      <Shield size={16} className="text-slate-500 dark:text-[#a19f9d]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1]">
                        {l("Détails du compte", "Account details")}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#a19f9d]">
                        {l("Informations générales sur votre compte", "General information about your account")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-[#a19f9d] mb-1">
                        {l("Rôle", "Role")}
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] text-sm text-slate-700 dark:text-[#e1dfdd] mm">
                        <Shield size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate capitalize">{user.role}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-[#a19f9d] mb-1">
                        {l("Statut", "Status")}
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] text-sm text-slate-700 dark:text-[#e1dfdd] mm">
                        <BadgeCheck size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate">{user.is_active ? t.common.active : t.common.inactive}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-[#a19f9d] mb-1">
                        {l("Email vérifié", "Email verified")}
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] text-sm text-slate-700 dark:text-[#e1dfdd] mm">
                        <Mail size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate">{user.email_verified ? t.common.yes : t.common.no}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-[#a19f9d] mb-1">
                        {l("Membre depuis", "Member since")}
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] text-sm text-slate-700 dark:text-[#e1dfdd] mm">
                        <Calendar size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate">{formatDate(user.created_at, locale)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="bg-white dark:bg-[#252423] border border-rose-200 dark:border-rose-900/60 mrc p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-rose-50 dark:bg-rose-950/40 mm">
                      <LogOut size={16} className="text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300">
                        {l("Zone dangereuse", "Danger zone")}
                      </h3>
                      <p className="text-xs text-rose-600 dark:text-rose-400">
                        {l("Actions irréversibles sur votre compte", "Irreversible actions on your account")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-[#f3f2f1]">
                        {l("Déconnexion", "Sign out")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-[#a19f9d]">
                        {l("Déconnectez-vous de tous les appareils", "Sign out from all devices")}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await AuthService.logout();
                        useAuthStore.getState().logout();
                        router.push("/login");
                      }}
                      className="px-4 py-2 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-sm font-medium transition-colors cursor-pointer mm flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      {l("Se déconnecter", "Sign out")}
                    </button>
                  </div>

                  <div className="border-t border-rose-100 dark:border-rose-900/40 my-2" />

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-[#f3f2f1]">
                        {l("Supprimer le compte", "Delete account")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-[#a19f9d]">
                        {l(
                          "Supprime définitivement votre compte et toutes vos données",
                          "Permanently deletes your account and all associated data"
                        )}
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
                      {t.common.delete}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#252423] border border-transparent dark:border-[#3b3a39] mrc shadow-xl w-full max-w-md mx-4 p-6 select-none">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-full shrink-0">
                <TriangleAlert size={20} className="text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1]">
                  {l("Supprimer le compte", "Delete account")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#a19f9d] mt-1">
                  {l(
                    "Cette action est irréversible. Toutes vos données seront définitivement supprimées.",
                    "This action is irreversible. All your data will be permanently deleted."
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 mm mb-4">
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                {l(
                  "La suppression de votre compte entraînera la perte définitive de toutes vos données, y compris vos CV analysés, évaluations, talents, recrutements, et toutes autres informations associées à votre compte.",
                  "Deleting your account will permanently erase all your data, including parsed resumes, evaluations, talents, recruitments, and all other information linked to your account."
                )}
              </p>
            </div>

            {deleteError && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 mm mb-4">
                <CircleAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
                <p className="text-xs text-rose-700 dark:text-rose-300">{deleteError}</p>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-[#c8c6c4] mb-2">
              {l("Tapez ", "Type ")}
              <span className="font-semibold text-slate-900 dark:text-[#f3f2f1]">{deletePhrase}</span>
              {l(" pour confirmer.", " to confirm.")}
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError(null);
              }}
              placeholder={deletePhrase}
              disabled={isDeleting}
              className="w-full px-3 py-2 border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-[#f3f2f1] focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors text-sm mm mb-4"
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
                className="px-4 py-2 border border-slate-200 dark:border-[#3b3a39] text-slate-600 dark:text-[#c8c6c4] hover:bg-slate-50 dark:hover:bg-[#323130] text-sm font-medium transition-colors cursor-pointer mm"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmText !== deletePhrase) {
                    setDeleteError(
                      l(
                        `Veuillez taper exactement « ${deletePhrase} » pour confirmer.`,
                        `Please type "${deletePhrase}" exactly to confirm.`
                      )
                    );
                    return;
                  }
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    await AuthService.deleteAccount();
                    useAuthStore.getState().logout();
                    router.push("/login");
                  } catch (err: unknown) {
                    const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
                    setDeleteError(
                      detail || l("Échec de la suppression du compte", "Failed to delete account")
                    );
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting || deleteConfirmText !== deletePhrase}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mm flex items-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {l("Supprimer mon compte", "Delete my account")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
