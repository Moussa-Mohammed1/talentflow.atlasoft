"use client";

import { useState, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { useModal } from "@/context/ModalContext";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/context/LanguageContext";
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
  const { t, l } = useLanguage();

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
      toast.success(l(`Invitation envoyée à ${email.trim()}`, `Invitation sent to ${email.trim()}`));
      onSuccess(email.trim());
      setEmail("");
      onClose();
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      toast.error(detail || l("Une erreur est survenue", "An error occurred"));
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 dark:bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden mrc border border-gray-200/80 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xl">
        <div className="border-b border-gray-100 dark:border-[#3b3a39] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[#f3f2f1]">
              {l("Inviter un recruteur", "Invite a recruiter")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#a19f9d] mt-0.5">
              {l("Envoyez une invitation par e-mail", "Send an invitation by email")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-[#f3f2f1] p-1 hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label
                htmlFor="invite-email"
                className="block text-xs font-semibold text-gray-700 dark:text-[#d2d0ce] mb-1.5"
              >
                {l("Adresse e-mail", "Email address")}
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={l("recruteur@entreprise.com", "recruiter@company.com")}
                disabled={sending}
                className="w-full border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#1b1a19] px-3 py-2 text-sm text-gray-900 dark:text-[#f3f2f1] placeholder-gray-400 dark:placeholder-[#8a8886] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:bg-gray-50 dark:disabled:bg-[#323130] disabled:text-gray-500"
              />
              <p className="text-xs text-gray-400 dark:text-[#a19f9d] mt-1.5">
                {l("L'invitation sera valable 48 heures", "The invitation will be valid for 48 hours")}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-md px-2 py-1.5 mt-2">
                {l(
                  "Les e-mails ne correspondant pas au domaine autorisé seront rejetés automatiquement",
                  "Email addresses not matching the allowed domain will be rejected automatically"
                )}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-[#3b3a39] bg-gray-50/70 dark:bg-[#1b1a19] px-6 py-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors disabled:opacity-50"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="inline-flex items-center gap-2 bg-[#0078d4] border border-[#0078d4] text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-[#106ebe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {l("Envoi en cours...", "Sending...")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {l("Envoyer l'invitation", "Send invitation")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
