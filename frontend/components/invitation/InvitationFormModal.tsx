"use client";

import { useState, useEffect } from "react";
import { Mail, X, Send, Loader2 } from "lucide-react";
import { useModal } from "@/context/ModalContext";
import { useToast } from "@/hooks/useToast";
import { InvitationService } from "@/services/invitation.service";

interface InvitationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export default function InvitationFormModal({
  isOpen,
  onClose,
  onSuccess,
}: InvitationFormModalProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const { setModalOpen } = useModal();
  const toast = useToast();

  useEffect(() => {
    setModalOpen(isOpen);
    return () => setModalOpen(false);
  }, [isOpen, setModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setSending(true);
    try {
      await InvitationService.invite(email.trim());
      toast.success(`Invitation envoyée à ${email.trim()}`);
      onSuccess(email.trim());
      setEmail("");
      onClose();
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data?: { detail?: string } } }).response?.data
              ?.detail
          : "Une erreur est survenue";
      toast.error(detail || "Une erreur est survenue");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Inviter un recruteur
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Envoyez une invitation par e-mail
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label
                htmlFor="invite-email"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                Adresse e-mail
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruteur@entreprise.com"
                disabled={sending}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                L&apos;invitation sera valable 48 heures
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-2 py-1.5 mt-2">
                Les e-mails ne correspondant pas au domaine autoris&eacute; seront
                rejet&eacute;s automatiquement
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-white border text-black px-4 py-2 text-sm font-medium hover:text-white shadow-xs hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer l&apos;invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
