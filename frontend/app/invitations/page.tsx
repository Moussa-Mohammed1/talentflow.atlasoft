"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  RotateCcw,
  Link,
  X,
  XCircle,
  Trash2,
  ExternalLink,
  Plus,
  RefreshCw,
  MailPlus,
  UserPlus,
} from "lucide-react";
import AppShell from "@/components/layouts/AppShell";
import { AtlasoftInviteIcon } from "@/components/layouts/AtlasoftIcons";
import InvitationFormModal from "@/components/invitation/InvitationFormModal";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/context/LanguageContext";
import type { Invitation, InvitationStatus } from "@/types/invitation";

function getStatus(inv: Invitation): InvitationStatus {
  if (inv.accepted) return "accepted";
  if (new Date(inv.expires_at) < new Date()) return "expired";
  return "pending";
}

function formatDate(dateStr: string, lang: "fr" | "en", locale: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return lang === "en" ? "Today" : "Aujourd'hui";
  if (diffDays === 1) return lang === "en" ? "Yesterday" : "Hier";
  if (diffDays < 7) {
    return lang === "en" ? `${diffDays} days ago` : `Il y a ${diffDays} jours`;
  }
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatExpiration(dateStr: string, lang: "fr" | "en"): { text: string; expired: boolean } {
  const date = new Date(dateStr);
  const now = new Date();
  if (date < now) return { text: lang === "en" ? "Expired" : "Expirée", expired: true };

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffDays > 1) {
    return {
      text: lang === "en" ? `In ${diffDays} days` : `Dans ${diffDays} jours`,
      expired: false,
    };
  }
  if (diffDays === 1) {
    return { text: lang === "en" ? "In 1 day" : "Dans 1 jour", expired: false };
  }
  return {
    text: lang === "en" ? `In ${diffHours} hours` : `Dans ${diffHours} heures`,
    expired: false,
  };
}

const getStatusConfig = (lang: "fr" | "en") => ({
  pending: {
    label: lang === "en" ? "Pending" : "En attente",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-600/10 dark:ring-amber-500/30",
    dot: "bg-amber-400",
  },
  accepted: {
    label: lang === "en" ? "Accepted" : "Acceptée",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-600/10 dark:ring-emerald-500/30",
    dot: "bg-emerald-400",
  },
  expired: {
    label: lang === "en" ? "Expired" : "Expirée",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-600/10 dark:ring-rose-500/30",
    dot: "bg-rose-400",
  },
});

export default function InvitationsPage() {
  const { language, locale, t, l } = useLanguage();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | "all">(
    "all"
  );
  const [sortBy, setSortBy] = useState<"recent" | "email">("recent");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailInv, setDetailInv] = useState<Invitation | null>(null);

  const toast = useToast();
  const statusConfig = useMemo(() => getStatusConfig(language), [language]);

  const loadInvitations = useCallback(async () => {
    try {
      const { InvitationService } = await import(
        "@/services/invitation.service"
      );
      const data = await InvitationService.getAll();
      setInvitations(data);
    } catch {
      // silently fail; show empty list
    }
  }, []);

  useEffect(() => {
    let active = true;
    import("@/services/invitation.service")
      .then(({ InvitationService }) => InvitationService.getAll())
      .then((data) => {
        if (active) setInvitations(data);
      })
      .catch(() => {
        // silently fail; show empty list
      });
    return () => {
      active = false;
    };
  }, []);

  const handleInviteSuccess = useCallback(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleResend = useCallback(
    async (email: string) => {
      try {
        const { InvitationService } = await import(
          "@/services/invitation.service"
        );
        await InvitationService.invite(email);
        toast.success(
          l(`Nouvelle invitation envoyée à ${email}`, `New invitation sent to ${email}`)
        );
      } catch {
        toast.error(
          l("Impossible de renvoyer l'invitation", "Unable to resend invitation")
        );
      }
    },
    [toast, l]
  );

  const handleCopyLink = useCallback(
    (email: string) => {
      const link = `${window.location.origin}/accept-invitation?email=${encodeURIComponent(email)}`;
      navigator.clipboard.writeText(link);
      toast.success(
        l(
          "Lien d'invitation copié dans le presse-papier",
          "Invitation link copied to clipboard"
        )
      );
    },
    [toast, l]
  );

  const handleRevoke = useCallback(
    async (id: number) => {
      try {
        const { InvitationService } = await import(
          "@/services/invitation.service"
        );
        await InvitationService.delete(id);
        setInvitations((prev) => prev.filter((inv) => inv.id !== id));
        toast.success(
          l("Invitation révoquée avec succès", "Invitation revoked successfully")
        );
      } catch {
        toast.error(
          l("Impossible de révoquer l'invitation", "Unable to revoke invitation")
        );
      }
    },
    [toast, l]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        const { InvitationService } = await import(
          "@/services/invitation.service"
        );
        await InvitationService.delete(id);
        setInvitations((prev) => prev.filter((inv) => inv.id !== id));
        toast.success(
          l("Enregistrement d'invitation supprimé", "Invitation record deleted")
        );
      } catch {
        toast.error(
          l("Impossible de supprimer l'invitation", "Unable to delete invitation")
        );
      }
    },
    [toast, l]
  );

  const filteredInvitations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return invitations
      .filter((inv) => {
        const status = getStatus(inv);
        if (statusFilter !== "all" && status !== statusFilter) return false;
        if (query && !inv.email.toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "email") return a.email.localeCompare(b.email);
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [invitations, searchQuery, statusFilter, sortBy]);

  const metrics = useMemo(
    () => ({
      pending: invitations.filter((i) => getStatus(i) === "pending").length,
      accepted: invitations.filter((i) => getStatus(i) === "accepted").length,
      expired: invitations.filter((i) => getStatus(i) === "expired").length,
      total: invitations.length,
    }),
    [invitations]
  );

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortBy("recent");
  }, []);

  const hasFilters = searchQuery || statusFilter !== "all" || sortBy !== "recent";

  return (
    <AppShell
      title={t.nav.invitations}
      icon={<AtlasoftInviteIcon size={22} />}
      breadcrumbs={[
        { label: t.nav.home, href: "/dashboard" },
        { label: t.nav.admin, href: "/admin" },
        { label: t.nav.invitations },
      ]}
      backgroundClassName="bg-[#f3f2f1]"
      headerActions={
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-[#0078d4] bg-[#0078d4] px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-[#106ebe] font-atlasoft"
        >
          <UserPlus className="h-4 w-4" />
          {l("Inviter un recruteur", "Invite a recruiter")}
        </button>
      }
    >
      <main className="flex-1 px-6 max-w-7xl mx-auto w-full space-y-6 pt-6">
        <p className="text-sm text-slate-600 dark:text-[#c8c6c4]">
          {language === "en" ? (
            <>
              Invite recruiters to collaborate. View the list of invitations, filter by{" "}
              <strong>status</strong> (Pending, Accepted, Expired) and perform actions:{" "}
              <strong>resend</strong>, <strong>revoke</strong>, or{" "}
              <strong>copy the link</strong>.
            </>
          ) : (
            <>
              Invitez des recruteurs à collaborer. Consultez la liste des invitations, filtrez par{" "}
              <strong>statut</strong> (En attente, Acceptée, Expirée) et effectuez des actions&nbsp;:{" "}
              <strong>renvoyer</strong>, <strong>révoquer</strong> ou{" "}
              <strong>copier le lien</strong> d&apos;invitation.
            </>
          )}
        </p>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center" />

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-600 dark:text-[#c8c6c4]">
          <div>
            <span className="font-medium">{l("En attente :", "Pending:")}</span>{" "}
            <span className="font-semibold text-slate-900 dark:text-[#f3f2f1]">
              {metrics.pending}
            </span>
          </div>

          <div>
            <span className="font-medium">{l("Acceptées :", "Accepted:")}</span>{" "}
            <span className="font-semibold text-slate-900 dark:text-[#f3f2f1]">
              {metrics.accepted}
            </span>
          </div>

          <div>
            <span className="font-medium">{l("Expirées :", "Expired:")}</span>{" "}
            <span className="font-semibold text-slate-900 dark:text-[#f3f2f1]">
              {metrics.expired}
            </span>
          </div>

          <div>
            <span className="font-medium">{l("Total :", "Total:")}</span>{" "}
            <span className="font-semibold text-slate-900 dark:text-[#f3f2f1]">
              {metrics.total}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 mrc border border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423] p-3 shadow-xs md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 h-full w-8" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={l("Rechercher par e-mail...", "Search by email...")}
              className="w-full border border-slate-200 dark:border-[#3b3a39] bg-transparent dark:bg-[#1b1a19] py-1.5 pl-9 pr-4 text-sm text-slate-900 dark:text-[#f3f2f1] placeholder-slate-400 dark:placeholder-[#8a8886] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as InvitationStatus | "all")
              }
              className="border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-[#d2d0ce] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">{l("Tous les statuts", "All statuses")}</option>
              <option value="pending">{l("En attente", "Pending")}</option>
              <option value="accepted">{l("Acceptée", "Accepted")}</option>
              <option value="expired">{l("Expirée", "Expired")}</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "recent" | "email")
              }
              className="border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-[#d2d0ce] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="recent">{l("Plus récentes", "Most recent")}</option>
              <option value="email">{l("Par e-mail", "By email")}</option>
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

        {filteredInvitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center mrc border border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423] py-16 px-4 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center mrc bg-blue-50 dark:bg-[#0078d4]/20 text-blue-600 dark:text-[#4ea8ff] mb-4">
              <MailPlus className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-[#f3f2f1]">
              {l("Aucune invitation pour le moment", "No invitations yet")}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-[#a19f9d]">
              {l(
                "Invitez des recruteurs à rejoindre votre espace de travail pour collaborer sur le recrutement.",
                "Invite recruiters to join your workspace and collaborate on hiring."
              )}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 inline-flex items-center justify-center border border-[#0078d4] gap-2 bg-[#0078d4] px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#106ebe] transition-colors"
            >
              <Plus className="h-4 w-4" />
              {l("Inviter un recruteur", "Invite a recruiter")}
            </button>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-hidden mrc border border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-500 dark:text-[#a19f9d]">
                  <thead className="bg-slate-50/70 dark:bg-[#1b1a19] text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#a19f9d] border-b border-slate-100 dark:border-[#3b3a39]">
                    <tr>
                      <th className="px-6 py-3.5">{l("E-mail", "Email")}</th>
                      <th className="px-6 py-3.5">{l("Invité par", "Invited by")}</th>
                      <th className="px-6 py-3.5">{l("Date d'envoi", "Sent date")}</th>
                      <th className="px-6 py-3.5">{l("Expiration", "Expiration")}</th>
                      <th className="px-6 py-3.5">{l("Statut", "Status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#3b3a39]">
                    {filteredInvitations.map((inv) => {
                      const status = getStatus(inv);
                      const cfg = statusConfig[status];
                      const exp = formatExpiration(inv.expires_at, language);
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => setDetailInv(inv)}
                          className="hover:bg-slate-50/40 dark:hover:bg-[#323130] cursor-pointer transition-colors group"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-[#f3f2f1]">
                            {inv.email}
                          </td>
                          <td className="px-6 py-4 text-xs dark:text-[#c8c6c4]">
                            {inv.invited_by_name}
                          </td>
                          <td className="px-6 py-4 text-xs dark:text-[#c8c6c4]">
                            {formatDate(inv.created_at, language, locale)}
                          </td>
                          <td
                            className={`px-6 py-4 text-xs ${
                              exp.expired
                                ? "text-rose-400"
                                : "text-slate-400 dark:text-[#a19f9d]"
                            }`}
                          >
                            {exp.text}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                              />
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredInvitations.map((inv) => {
                const status = getStatus(inv);
                const cfg = statusConfig[status];
                const exp = formatExpiration(inv.expires_at, language);
                return (
                  <div
                    key={inv.id}
                    onClick={() => setDetailInv(inv)}
                    className="mrc border border-slate-100 dark:border-[#3b3a39] bg-white dark:bg-[#252423] p-4 shadow-xs space-y-3 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-[#f3f2f1] truncate">
                          {inv.email}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-[#a19f9d] mt-0.5">
                          {inv.invited_by_name}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset shrink-0 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                        />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 text-xs border-t border-slate-100 dark:border-[#3b3a39] pt-2 text-slate-500 dark:text-[#a19f9d]">
                      <div>
                        <span className="text-slate-400">{l("Envoi :", "Sent:")}</span>{" "}
                        {formatDate(inv.created_at, language, locale)}
                      </div>
                      <div>
                        <span className="text-slate-400">{l("Expire :", "Expires:")}</span>{" "}
                        {exp.text}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-50 dark:border-[#3b3a39] pt-2">
                      {status === "pending" && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleResend(inv.email); }}
                            className="inline-flex items-center gap-1 border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-[#d2d0ce]"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {l("Renvoyer", "Resend")}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(inv.email); }}
                            className="inline-flex items-center gap-1 border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-[#d2d0ce]"
                          >
                            <Link className="h-3 w-3" />
                            {l("Copier", "Copy")}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRevoke(inv.id); }}
                            className="inline-flex items-center gap-1 border border-rose-100 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/40 px-2.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300"
                          >
                            <XCircle className="h-3 w-3" />
                            {l("Révoquer", "Revoke")}
                          </button>
                        </>
                      )}
                      {status === "accepted" && (
                        <button onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-[#4ea8ff] px-3 py-1.5 bg-blue-50 dark:bg-[#0078d4]/20">
                          <ExternalLink className="h-3 w-3" />
                          {l("Voir le profil", "View profile")}
                        </button>
                      )}
                      {status === "expired" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                          className="inline-flex items-center gap-1 border border-rose-100 dark:border-rose-800 bg-white dark:bg-[#1b1a19] px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t.common.delete}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <InvitationFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleInviteSuccess}
      />

      <InvitationDetailModal
        invitation={detailInv}
        onClose={() => setDetailInv(null)}
        onResend={handleResend}
        onCopyLink={handleCopyLink}
        onRevoke={handleRevoke}
        onDelete={handleDelete}
      />

      {invitations.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/20 whitespace-nowrap active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4" />
            {l("Inviter un recruteur", "Invite a recruiter")}
          </button>
        </div>
      )}
    </AppShell>
  );
}

function InvitationDetailModal({
  invitation,
  onClose,
  onResend,
  onCopyLink,
  onRevoke,
  onDelete,
}: {
  invitation: Invitation | null;
  onClose: () => void;
  onResend: (email: string) => void;
  onCopyLink: (email: string) => void;
  onRevoke: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { language, locale, t, l } = useLanguage();

  useEffect(() => {
    if (invitation) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [invitation, onClose]);

  if (!invitation) return null;

  const statusConfig = getStatusConfig(language);
  const status = getStatus(invitation);
  const cfg = statusConfig[status];
  const exp = formatExpiration(invitation.expires_at, language);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 dark:bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden mrc border border-gray-200/80 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 dark:border-[#3b3a39] px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-[#f3f2f1]">
            {l("Détails de l'invitation", "Invitation details")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-[#f3f2f1] p-1 hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-[#a19f9d] uppercase tracking-wider mb-1">
                {l("E-mail", "Email")}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-[#f3f2f1]">{invitation.email}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-[#a19f9d] uppercase tracking-wider mb-1">
                {l("Invitée par", "Invited by")}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-[#f3f2f1]">{invitation.invited_by_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-[#a19f9d] uppercase tracking-wider mb-1">
                {l("Date d'envoi", "Sent on")}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-[#f3f2f1]">
                {formatDate(invitation.created_at, language, locale)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-[#a19f9d] uppercase tracking-wider mb-1">
                {l("Expiration", "Expiration")}
              </p>
              <p className={`text-sm font-medium ${exp.expired ? "text-rose-500 dark:text-rose-400" : "text-gray-900 dark:text-[#f3f2f1]"}`}>
                {exp.text}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-[#a19f9d] uppercase tracking-wider mb-1">
                {l("Acceptée", "Accepted")}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-[#f3f2f1]">
                {invitation.accepted ? t.common.yes : t.common.no}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-[#3b3a39] bg-gray-50/70 dark:bg-[#1b1a19] px-6 py-4 flex items-center justify-end gap-2">
          {status === "pending" && (
            <>
              <button
                onClick={() => { onResend(invitation.email); onClose(); }}
                className="inline-flex items-center gap-1.5 border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-3 py-2 text-xs font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {l("Renvoyer", "Resend")}
              </button>
              <button
                onClick={() => { onCopyLink(invitation.email); onClose(); }}
                className="inline-flex items-center gap-1.5 border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-3 py-2 text-xs font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
              >
                <Link className="h-3.5 w-3.5" />
                {l("Copier le lien", "Copy link")}
              </button>
              <button
                onClick={() => { onRevoke(invitation.id); onClose(); }}
                className="inline-flex items-center gap-1.5 border border-rose-100 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/40 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300 shadow-xs hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                {l("Révoquer", "Revoke")}
              </button>
            </>
          )}
          {status === "accepted" && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-3 py-2 text-xs font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {l("Voir le profil", "View profile")}
            </button>
          )}
          {status === "expired" && (
            <button
              onClick={() => { onDelete(invitation.id); onClose(); }}
              className="inline-flex items-center gap-1.5 border border-rose-100 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/40 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300 shadow-xs hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.common.delete}
            </button>
          )}
          <button
            onClick={onClose}
            className="border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
