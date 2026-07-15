"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
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
import Sidebar from "@/components/layouts/Sidebar";
import NotificationButton from "@/components/ui/NotificationButton";
import InvitationFormModal from "@/components/invitation/InvitationFormModal";
import { useToast } from "@/hooks/useToast";
import type { Invitation, InvitationStatus } from "@/types/invitation";

function getStatus(inv: Invitation): InvitationStatus {
  if (inv.accepted) return "accepted";
  if (new Date(inv.expires_at) < new Date()) return "expired";
  return "pending";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatExpiration(dateStr: string): { text: string; expired: boolean } {
  const date = new Date(dateStr);
  const now = new Date();
  if (date < now) return { text: "Expirée", expired: true };

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffDays > 1) return { text: `Dans ${diffDays} jours`, expired: false };
  if (diffDays === 1) return { text: "Dans 1 jour", expired: false };
  return { text: `Dans ${diffHours} heures`, expired: false };
}

const statusConfig = {
  pending: {
    label: "En attente",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-600/10",
    dot: "bg-amber-400",
  },
  accepted: {
    label: "Acceptée",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-600/10",
    dot: "bg-emerald-400",
  },
  expired: {
    label: "Expirée",
    bg: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-600/10",
    dot: "bg-rose-400",
  },
};

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | "all">(
    "all"
  );
  const [sortBy, setSortBy] = useState<"recent" | "email">("recent");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailInv, setDetailInv] = useState<Invitation | null>(null);

  const toast = useToast();

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
    loadInvitations();
  }, [loadInvitations]);

  const handleInviteSuccess = useCallback(
    (_email: string) => {
      loadInvitations();
    },
    [loadInvitations]
  );

  const handleResend = useCallback(
    async (email: string) => {
      try {
        const { InvitationService } = await import(
          "@/services/invitation.service"
        );
        await InvitationService.invite(email);
        toast.success(`Nouvelle invitation envoyée à ${email}`);
      } catch {
        toast.error("Impossible de renvoyer l'invitation");
      }
    },
    [toast]
  );

  const handleCopyLink = useCallback(
    (email: string) => {
      const link = `${window.location.origin}/accept-invitation?email=${encodeURIComponent(email)}`;
      navigator.clipboard.writeText(link);
      toast.success("Lien d'invitation copié dans le presse-papier");
    },
    [toast]
  );

  const handleRevoke = useCallback(
    async (id: number) => {
      try {
        const { InvitationService } = await import(
          "@/services/invitation.service"
        );
        await InvitationService.delete(id);
        setInvitations((prev) => prev.filter((inv) => inv.id !== id));
        toast.success("Invitation révoquée avec succès");
      } catch {
        toast.error("Impossible de révoquer l'invitation");
      }
    },
    [toast]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        const { InvitationService } = await import(
          "@/services/invitation.service"
        );
        await InvitationService.delete(id);
        setInvitations((prev) => prev.filter((inv) => inv.id !== id));
        toast.success("Enregistrement d'invitation supprimé");
      } catch {
        toast.error("Impossible de supprimer l'invitation");
      }
    },
    [toast]
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
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-slate-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
            <h1 className="text-lg font-bold text-slate-900">
                Invitations
            </h1>

            <div className="flex items-center gap-3">
                
                <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2  border bg-white px-2.5 py-2.5 text-xs font-medium text-black shadow-xs transition-all hover:bg-black hover:text-white"
                >
                <UserPlus className="h-4 w-4" />
                Inviter un recruteur
                </button>
                <NotificationButton />

            </div>
        </header>

        <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          <p className="text-sm text-slate-600">Invitez des recruteurs à collaborer. Consultez la liste des invitations, filtrez par <strong>statut</strong> (En attente, Acceptée, Expirée) et effectuez des actions&nbsp;: <strong>renvoyer</strong>, <strong>révoquer</strong> ou <strong>copier le lien</strong> d&apos;invitation.</p>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            
          </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-600">
                <div>
                    <span className="font-medium">En attente:</span>{" "}
                    <span className="font-semibold text-slate-900">
                    {metrics.pending}
                    </span>
                </div>

                <div>
                    <span className="font-medium">Acceptées:</span>{" "}
                    <span className="font-semibold text-slate-900">
                    {metrics.accepted}
                    </span>
                </div>

                <div>
                    <span className="font-medium">Expirées:</span>{" "}
                    <span className="font-semibold text-slate-900">
                    {metrics.expired}
                    </span>
                </div>

                <div>
                    <span className="font-medium">Total:</span>{" "}
                    <span className="font-semibold text-slate-900">
                    {metrics.total}
                    </span>
                </div>
            </div>

          <div className="flex flex-col gap-3 mrc border border-slate-100 bg-white p-3 shadow-xs md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 h-full w-8" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par e-mail..."
                className="w-full  border border-slate-200 bg-transparent py-1.5 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as InvitationStatus | "all")
                }
                className=" border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="accepted">Acceptée</option>
                <option value="expired">Expirée</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "recent" | "email")
                }
                className=" border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="recent">Plus récentes</option>
                <option value="email">Par e-mail</option>
              </select>

              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="p-1.5 text-slate-400 hover:text-slate-600  hover:bg-slate-50 border border-slate-200 bg-white transition-colors"
                  title="Réinitialiser les filtres"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {filteredInvitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center mrc border border-slate-100 bg-white py-16 px-4 text-center shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center mrc bg-blue-50 text-blue-600 mb-4">
                <MailPlus className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Aucune invitation pour le moment
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Invitez des recruteurs à rejoindre votre espace de travail pour
                collaborer sur le recrutement.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 inline-flex items-center justify-center border gap-2 bg-white px-2 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-black transition-colors"
              >
                <Plus className="h-4 w-4" />
                Inviter un recruteur
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-hidden mrc border border-slate-100 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-500">
                    <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5">E-mail</th>
                        <th className="px-6 py-3.5">Invité par</th>
                        <th className="px-6 py-3.5">Date d&apos;envoi</th>
                        <th className="px-6 py-3.5">Expiration</th>
                        <th className="px-6 py-3.5">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInvitations.map((inv) => {
                        const status = getStatus(inv);
                        const cfg = statusConfig[status];
                        const exp = formatExpiration(inv.expires_at);
                        return (
                          <tr
                            key={inv.id}
                            onClick={() => setDetailInv(inv)}
                            className="hover:bg-slate-50/40 cursor-pointer transition-colors group"
                          >
                            <td className="px-6 py-4 font-medium text-slate-900">
                              {inv.email}
                            </td>
                            <td className="px-6 py-4 text-xs">
                              {inv.invited_by_name}
                            </td>
                            <td className="px-6 py-4 text-xs">
                              {formatDate(inv.created_at)}
                            </td>
                            <td
                              className={`px-6 py-4 text-xs ${
                                exp.expired
                                  ? "text-rose-400"
                                  : "text-slate-400"
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
                  const exp = formatExpiration(inv.expires_at);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => setDetailInv(inv)}
                      className="mrc border border-slate-100 bg-white p-4 shadow-xs space-y-3 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">
                            {inv.email}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
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
                      <div className="grid grid-cols-2 gap-y-1 text-xs border-t border-slate-100 pt-2 text-slate-500">
                        <div>
                          <span className="text-slate-400">Envoi :</span>{" "}
                          {formatDate(inv.created_at)}
                        </div>
                        <div>
                          <span className="text-slate-400">Expire :</span>{" "}
                          {exp.text}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-2">
                        {status === "pending" && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleResend(inv.email); }}
                              className="inline-flex items-center gap-1  border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Renvoyer
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyLink(inv.email); }}
                              className="inline-flex items-center gap-1  border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                            >
                              <Link className="h-3 w-3" />
                              Copier
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRevoke(inv.id); }}
                              className="inline-flex items-center gap-1  border border-rose-100 bg-rose-50/50 px-2.5 py-1.5 text-xs font-medium text-rose-700"
                            >
                              <XCircle className="h-3 w-3" />
                              Révoquer
                            </button>
                          </>
                        )}
                        
                        {status === "expired" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                            className="inline-flex items-center gap-1  border border-rose-100 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600"
                          >
                            <Trash2 className="h-3 w-3" />
                            Supprimer
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
      </div>

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
            Inviter un recruteur
          </button>
        </div>
      )}
    </div>
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

  const status = getStatus(invitation);
  const cfg = statusConfig[status];
  const exp = formatExpiration(invitation.expires_at);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden mrc border border-gray-200/80 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Détails de l&apos;invitation</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">E-mail</p>
              <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
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
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Invitée par</p>
              <p className="text-sm font-medium text-gray-900">{invitation.invited_by_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Date d&apos;envoi</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(invitation.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Expiration</p>
              <p className={`text-sm font-medium ${exp.expired ? "text-rose-500" : "text-gray-900"}`}>
                {exp.text}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Acceptée</p>
              <p className="text-sm font-medium text-gray-900">
                {invitation.accepted ? "Oui" : "Non"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4 flex items-center justify-end gap-2">
          {status === "pending" && (
            <>
              <button
                onClick={() => { onResend(invitation.email); onClose(); }}
                className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Renvoyer
              </button>
              <button
                onClick={() => { onCopyLink(invitation.email); onClose(); }}
                className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
              >
                <Link className="h-3.5 w-3.5" />
                Copier le lien
              </button>
              <button
                onClick={() => { onRevoke(invitation.id); onClose(); }}
                className="inline-flex items-center gap-1.5 border border-rose-100 bg-rose-50/50 px-3 py-2 text-xs font-medium text-rose-700 shadow-xs hover:bg-rose-100 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Révoquer
              </button>
            </>
          )}
          
          {status === "expired" && (
            <button
              onClick={() => { onDelete(invitation.id); onClose(); }}
              className="inline-flex items-center gap-1.5 border border-rose-100 bg-rose-50/50 px-3 py-2 text-xs font-medium text-rose-700 shadow-xs hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          )}
          <button
            onClick={onClose}
            className="border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
