"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, CircleAlert, PenLine, Mail, User, Shield, Calendar, BadgeCheck, Camera } from "lucide-react";
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/hooks/useToast";

interface EditableField {
  key: "fullname" | "email";
  label: string;
  type: "text" | "email";
  icon: typeof User | typeof Mail;
}

const editableFields: EditableField[] = [
  { key: "fullname", label: "Nom complet", type: "text", icon: User },
  { key: "email", label: "Adresse e-mail", type: "email", icon: Mail },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}



const infoFields = [
  { key: "role", label: "Rôle", icon: Shield },
  { key: "is_active", label: "Statut", icon: BadgeCheck },
  { key: "email_verified", label: "Email vérifié", icon: BadgeCheck },
  { key: "created_at", label: "Membre depuis", icon: Calendar },
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

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, updateUserField } = useAuthStore();
  const { success, error: showError } = useToast();
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
      console.log(user)
      const response = await AuthService.updateProfile({ [key]: value });
      updateUserField(key as keyof typeof user, value);
      setUser(response.user);
      success(`${editableFields.find((f) => f.key === key)?.label || key} a été modifié avec success`);
      setEditingField(null);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.errors?.[key]?.[0] ||
        `Échec de la mise à jour`;
      setErrorFields((prev) => ({ ...prev, [key]: message }));
    } finally {
      setSavingFields((prev) => ({ ...prev, [key]: false }));
    }
  }, [draftValues, user, updateUserField, setUser, success, cancelEditing]);

  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setAvatarError("Format non supporté. Utilisez JPG, PNG, GIF ou WebP.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarError(null);
  }, []);

  const handleAvatarSave = useCallback(async () => {
    if (!avatarFile) return;

    setIsSavingAvatar(true);
    setAvatarError(null);

    try {
      const response = await AuthService.uploadAvatar(avatarFile);
      updateUserField("avatar", response.user.avatar);
      setUser(response.user);
      success("Avatar mis à jour");
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err: any) {
      setAvatarError(
        err?.response?.data?.detail || "Échec de la mise à jour de l'avatar"
      );
    } finally {
      setIsSavingAvatar(false);
    }
  }, [avatarFile, updateUserField, setUser, success]);

  const handlePasswordSave = useCallback(async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError("Les deux champs sont requis.");
      return;
    }

    setIsSavingPassword(true);
    setPasswordError(null);

    try {
      const response = await AuthService.updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });
      updateUserField("must_change_password", response.user.must_change_password);
      setUser(response.user);
      success("Mot de passe mis à jour");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordError(
        err?.response?.data?.detail || "Échec de la mise à jour du mot de passe"
      );
    } finally {
      setIsSavingPassword(false);
    }
  }, [currentPassword, newPassword, updateUserField, setUser, success]);

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
          <h1 className="text-lg font-bold text-slate-900">Mon Profil</h1>
          <NotificationButton />
        </header>

        <main className="flex-1 px-6 pb-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white border border-slate-100 rounded-xl p-6">
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
                    title="Changer l'avatar"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Aperçu"
                        className="w-14 h-14 rounded-full object-cover border-2 border-blue-500"
                      />
                    ) : user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.fullname}
                        className="w-14 h-14 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-blue-800 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-transparent group-hover:border-blue-400 transition-colors">
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
                        className="px-2.5 py-1 rounded-lg bg-blue-800 hover:bg-blue-600 text-white text-[10px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                      >
                        {isSavingAvatar ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={10} />
                        )}
                        Enregistrer
                      </button>

                      <button
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                          setAvatarError(null);
                        }}
                        disabled={isSavingAvatar}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Annuler
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
                  <h2 className="text-sm font-bold text-slate-900">{user.fullname}</h2>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>

              {user.must_change_password && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <CircleAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
                  <p className="text-xs text-rose-700 leading-relaxed">
                    Vous devez changer votre premier mot de passe après votre première inscription.
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
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
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
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
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
                              className="shrink-0 px-3 py-2 rounded-lg bg-blue-800 hover:bg-blue-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                            >
                              {isSaving ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={12} />
                              )}
                              Enregistrer
                            </button>

                            <button
                              onClick={() => cancelEditing(field.key)}
                              disabled={isSaving}
                              className="shrink-0 px-2 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Annuler
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
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-700">
                            <Icon size={14} className="shrink-0 text-slate-400" />
                            <span className="truncate">{currentValue || "-"}</span>
                          </div>

                          <button
                            onClick={() => startEditing(field.key)}
                            className="shrink-0 p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            title={`Modifier ${field.label}`}
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

            <div className="bg-white border border-slate-100 rounded-xl p-6">
              <h3 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wider">
                Mot de passe
              </h3>

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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
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
                    placeholder="Entrez votre nouveau mot de passe"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                    disabled={isSavingPassword}
                  />
                </div>

                {passwordError && (
                  <p className="flex items-center gap-1 text-xs text-rose-500">
                    <CircleAlert size={12} />
                    {passwordError}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handlePasswordSave}
                    disabled={isSavingPassword || !currentPassword || !newPassword}
                    className="px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                  >
                    {isSavingPassword ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-6">
              <h3 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wider">
                Informations du compte
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {infoFields.map((field) => {
                  const Icon = field.icon;
                  const rawValue = user[field.key as keyof typeof user];
                  let displayValue: string;

                  if (field.key === "created_at") {
                    displayValue = formatDate(rawValue as string);
                  } else if (typeof rawValue === "boolean") {
                    displayValue = rawValue ? "Active" : "Non";
                  } else {
                    displayValue = rawValue?.toString() || "-";
                  }

                  return (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {field.label}
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-700">
                        <Icon size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate capitalize">{displayValue}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
