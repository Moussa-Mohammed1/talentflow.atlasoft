"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, CircleAlert, PenLine, Mail, User, Shield, Calendar, BadgeCheck, Camera, FileText, Cpu, Send } from "lucide-react";
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftProfileIcon } from "@/components/layouts/AtlasoftIcons";
import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/context/LanguageContext";
import type { UserStats } from "@/types/auth";

interface EditableField {
  key: "fullname" | "email";
  label: string;
  type: "text" | "email";
  icon: typeof User | typeof Mail;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, updateUserField } = useAuthStore();
  const { success } = useToast();
  const { locale, t, l } = useLanguage();
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({});
  const [errorFields, setErrorFields] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const editableFields: EditableField[] = [
    { key: "fullname", label: l("Nom complet", "Full name"), type: "text", icon: User },
    { key: "email", label: l("Adresse e-mail", "Email address"), type: "email", icon: Mail },
  ];

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

  const infoFields = [
    { key: "role", label: l("Rôle", "Role"), icon: Shield },
    { key: "is_active", label: l("Statut", "Status"), icon: BadgeCheck },
    { key: "auth_provider", label: l("Authentification", "Authentication"), icon: Shield },
    { key: "created_at", label: l("Membre depuis", "Member since"), icon: Calendar },
  ];

  useEffect(() => {
    if (!user) {
      setIsLoadingUser(true);
      AuthService.me()
        .then((data) => {
          setUser(data.user);
        })
        .catch(() => {
          router.push("/login");
        })
        .finally(() => {
          setIsLoadingUser(false);
        });
    }
  }, [user, setUser, router]);

  useEffect(() => {
    if (user) {
      setIsLoadingStats(true);
      AuthService.getUserStats()
        .then(setStats)
        .finally(() => setIsLoadingStats(false));
    }
  }, [user]);

  const startEditing = useCallback((key: string) => {
    setEditingField(key);
    setDraftValues((prev) => ({
      ...prev,
      [key]: user?.[key as keyof typeof user]?.toString() || "",
    }));
    setErrorFields((prev) => ({ ...prev, [key]: "" }));
  }, [user]);

  const cancelEditing = useCallback((key: string) => {
    setEditingField((prev) => (prev === key ? null : prev));
    setDraftValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setErrorFields((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSave = useCallback(async (key: string) => {
    const value = draftValues[key]?.trim();
    if (value === undefined) return;

    const previousValue = user?.[key as keyof typeof user]?.toString() || "";

    if (value === previousValue) {
      cancelEditing(key);
      return;
    }

    setSavingFields((prev) => ({ ...prev, [key]: true }));
    setErrorFields((prev) => ({ ...prev, [key]: "" }));

    try {
      const response = await AuthService.updateProfile({ [key]: value });
      updateUserField(key as keyof typeof user, value);
      setUser(response.user);
      const label = editableFields.find((f) => f.key === key)?.label || key;
      success(l(`${label} mis à jour avec succès`, `${label} updated successfully`));
      setEditingField(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; errors?: Record<string, string[]> } } };
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.errors?.[key]?.[0] ||
        l("Échec de la mise à jour", "Update failed");
      setErrorFields((prev) => ({ ...prev, [key]: message }));
    } finally {
      setSavingFields((prev) => ({ ...prev, [key]: false }));
    }
  }, [draftValues, user, updateUserField, setUser, success, cancelEditing, editableFields, l]);

  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setAvatarError(
        l(
          "Format non supporté. Utilisez JPG, PNG, GIF ou WebP.",
          "Unsupported format. Use JPG, PNG, GIF, or WebP."
        )
      );
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarError(null);
  }, [l]);

  const handleAvatarSave = useCallback(async () => {
    if (!avatarFile) return;

    setIsSavingAvatar(true);
    setAvatarError(null);

    try {
      const response = await AuthService.uploadAvatar(avatarFile);
      updateUserField("avatar", response.user.avatar);
      setUser(response.user);
      success(l("Avatar mis à jour", "Avatar updated"));
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setAvatarError(
        detail || l("Échec de la mise à jour de l'avatar", "Failed to update avatar")
      );
    } finally {
      setIsSavingAvatar(false);
    }
  }, [avatarFile, updateUserField, setUser, success, l]);

  if (isLoadingUser || !user) {
    return (
      <AppShell
        title={t.nav.profile}
        icon={<AtlasoftProfileIcon size={22} />}
        breadcrumbs={[{ label: t.nav.home, href: "/dashboard" }, { label: t.nav.profile }]}
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
      title={t.nav.profile}
      icon={<AtlasoftProfileIcon size={22} />}
      breadcrumbs={[{ label: t.nav.home, href: "/dashboard" }, { label: t.nav.profile }]}
      backgroundClassName="bg-[#f3f2f1]"
    >
      <main className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-slate-600 dark:text-[#c8c6c4] mb-6">
            {l(
              "Consultez et modifiez vos informations personnelles. Téléchargez un avatar, modifiez votre nom et votre email, et consultez vos statistiques d'utilisation de l'IA.",
              "View and update your personal details. Upload an avatar, edit your name and email, and track your AI usage statistics."
            )}
          </p>
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex flex-col items-center gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />

                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isSavingAvatar}
                    className="relative group cursor-pointer disabled:cursor-not-allowed"
                    title={l("Changer l'avatar", "Change avatar")}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={l("Aperçu", "Preview")}
                        className="w-14 h-14 rounded-full object-cover border-2 border-blue-500"
                      />
                    ) : user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.fullname}
                        className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-[#3b3a39]"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-blue-800 dark:bg-[#0078d4] rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-transparent group-hover:border-blue-400 transition-colors">
                        {getInitials(user.fullname)}
                      </div>
                    )}

                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={16} className="text-white" />
                    </div>
                  </button>

                  {avatarPreview && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleAvatarSave}
                        disabled={isSavingAvatar}
                        className="px-2.5 py-1 bg-blue-800 hover:bg-blue-600 dark:bg-[#0078d4] dark:hover:bg-[#106ebe] text-white text-[10px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                      >
                        {isSavingAvatar ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={10} />
                        )}
                        {t.common.save}
                      </button>

                      <button
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                          setAvatarError(null);
                        }}
                        disabled={isSavingAvatar}
                        className="px-2 py-1 border border-slate-200 dark:border-[#3b3a39] text-slate-500 dark:text-[#a19f9d] hover:bg-slate-50 dark:hover:bg-[#323130] text-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {t.common.cancel}
                      </button>
                    </div>
                  )}

                  {avatarError && (
                    <p className="flex items-center gap-1 text-[10px] text-rose-500">
                      <CircleAlert size={10} />
                      {avatarError}
                    </p>
                  )}
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-[#f3f2f1]">{user.fullname}</h2>
                  <p className="text-xs text-slate-500 dark:text-[#a19f9d] flex items-center gap-1">
                    {user.email}
                    {user.auth_provider === "linkedin" && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 dark:bg-[#0078d4]/20 border border-blue-200 dark:border-[#2899f5]/40 text-blue-700 dark:text-[#4ea8ff] text-[9px] font-semibold">
                        <svg className="w-[9px] h-[9px]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        LinkedIn
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {user.must_change_password && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 mb-4">
                  <CircleAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
                  <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                    {l(
                      "Vous devez changer votre premier mot de passe après votre première inscription.",
                      "You must change your temporary password after your first sign-in."
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {editableFields.map((field) => {
                  const Icon = field.icon;
                  const isEditing = editingField === field.key;
                  const isSaving = savingFields[field.key];
                  const fieldError = errorFields[field.key];
                  const currentValue = user[field.key]?.toString() || "";

                  return (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-slate-700 dark:text-[#d2d0ce] mb-1.5">
                        {field.label}
                      </label>

                      {isEditing ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Icon
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                              />
                              <input
                                type={field.type}
                                value={draftValues[field.key] || ""}
                                onChange={(e) =>
                                  setDraftValues((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-[#f3f2f1] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                                autoFocus
                                disabled={isSaving}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSave(field.key);
                                  if (e.key === "Escape") cancelEditing(field.key);
                                }}
                              />
                            </div>

                            <button
                              onClick={() => handleSave(field.key)}
                              disabled={isSaving}
                              className="shrink-0 px-3 py-2 bg-blue-800 hover:bg-blue-600 dark:bg-[#0078d4] dark:hover:bg-[#106ebe] text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                            >
                              {isSaving ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={12} />
                              )}
                              {t.common.save}
                            </button>

                            <button
                              onClick={() => cancelEditing(field.key)}
                              disabled={isSaving}
                              className="shrink-0 px-2 py-2 border border-slate-200 dark:border-[#3b3a39] text-slate-500 dark:text-[#a19f9d] hover:bg-slate-50 dark:hover:bg-[#323130] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {t.common.cancel}
                            </button>
                          </div>

                          {fieldError && (
                            <p className="flex items-center gap-1 text-xs text-rose-500">
                              <CircleAlert size={12} />
                              {fieldError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] text-sm text-slate-700 dark:text-[#d2d0ce]">
                            <Icon size={14} className="shrink-0 text-slate-400" />
                            <span className="truncate">{currentValue || "-"}</span>
                          </div>

                          <button
                            onClick={() => startEditing(field.key)}
                            className="shrink-0 p-2 border border-slate-200 dark:border-[#3b3a39] text-slate-400 hover:text-slate-700 dark:hover:text-[#f3f2f1] hover:bg-slate-50 dark:hover:bg-[#323130] transition-colors cursor-pointer"
                            title={`${t.common.edit} ${field.label}`}
                          >
                            <PenLine size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-6">
              <h3 className="text-xs font-bold text-slate-900 dark:text-[#f3f2f1] mb-4 uppercase tracking-wider">
                {l("Activités & Statistiques", "Activity & Statistics")}
              </h3>

              {isLoadingStats ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 px-3 py-3 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19]">
                      <FileText size={18} className="shrink-0 text-blue-600 dark:text-[#4ea8ff]" />
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-[#f3f2f1] leading-tight">{stats.resume_count}</p>
                        <p className="text-[10px] text-slate-500 dark:text-[#a19f9d] leading-tight">
                          {l("CV analysés", "Parsed resumes")}
                        </p>
                      </div>
                    </div>

                    {user.role === "admin" && (
                      <div className="flex items-center gap-3 px-3 py-3 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19]">
                        <Send size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="text-lg font-bold text-slate-900 dark:text-[#f3f2f1] leading-tight">{stats.invitations_sent}</p>
                          <p className="text-[10px] text-slate-500 dark:text-[#a19f9d] leading-tight">
                            {l("Invitations envoyées", "Invitations sent")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-[#d2d0ce] mb-2 flex items-center gap-1.5">
                      <Cpu size={14} className="text-purple-600 dark:text-purple-400" />
                      {l("Requêtes LLM par action", "LLM requests by action")}
                    </h4>
                    <div className="border border-slate-100 dark:border-[#3b3a39] overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-[#1b1a19] border-b border-slate-100 dark:border-[#3b3a39]">
                            <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-[#c8c6c4]">
                              {l("Action", "Action")}
                            </th>
                            <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-[#c8c6c4]">
                              {l("Nombre de requêtes", "Request count")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.llm_usage_by_action.map((row) => (
                            <tr key={row.action} className="border-b border-slate-50 dark:border-[#323130] last:border-b-0">
                              <td className="px-3 py-2 text-slate-700 dark:text-[#d2d0ce]">
                                {llmActionLabels[row.action] || row.action}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-900 dark:text-[#f3f2f1] font-medium">
                                {row.count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 dark:bg-[#1b1a19] border-t border-slate-100 dark:border-[#3b3a39]">
                            <td className="px-3 py-2 font-semibold text-slate-700 dark:text-[#d2d0ce]">Total</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-[#f3f2f1]">{stats.successful_llm_requests}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="bg-white dark:bg-[#252423] border border-slate-100 dark:border-[#3b3a39] mrc p-6">
              <h3 className="text-xs font-bold text-slate-900 dark:text-[#f3f2f1] mb-4 uppercase tracking-wider">
                {l("Informations du compte", "Account information")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {infoFields.map((field) => {
                  const Icon = field.icon;
                  const rawValue = user[field.key as keyof typeof user];
                  let displayValue: string;

                  if (field.key === "created_at") {
                    displayValue = formatDate(rawValue as string, locale);
                  } else if (field.key === "auth_provider") {
                    displayValue =
                      rawValue === "linkedin"
                        ? "LinkedIn"
                        : l("Email / Mot de passe", "Email / Password");
                  } else if (typeof rawValue === "boolean") {
                    displayValue = rawValue ? t.common.active : t.common.no;
                  } else {
                    displayValue = rawValue?.toString() || "-";
                  }

                  return (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-slate-500 dark:text-[#a19f9d] mb-1">
                        {field.label}
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 border border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] text-sm text-slate-700 dark:text-[#d2d0ce]">
                        {field.key === "auth_provider" && user.auth_provider === "linkedin" ? (
                          <svg className="w-[14px] h-[14px] shrink-0 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        ) : (
                          <Icon size={14} className="shrink-0 text-slate-400" />
                        )}
                        <span className="truncate">{displayValue}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
