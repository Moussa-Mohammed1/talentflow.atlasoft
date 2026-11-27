"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { X, ArrowRight, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useLanguage } from "@/context/LanguageContext";

const STORAGE_KEY = "password_banner_dismissed";

export default function PasswordChangeBanner() {
  const user = useAuthStore((s) => s.user);
  const { l } = useLanguage();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevUserRef = useRef(user);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(STORAGE_KEY) === "true");
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!prevUserRef.current && user) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
      setDismissed(false);
    }
    prevUserRef.current = user;
  }, [user]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  }, []);

  if (!ready) return null;
  if (dismissed) return null;
  if (!user?.must_change_password) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs w-full animate-toast-enter motion-reduce:animate-none">
      <div className="relative bg-white dark:bg-[#252423] border border-amber-200 dark:border-amber-700/60 mrc shadow-lg p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#323130] transition-colors cursor-pointer"
          aria-label={l("Fermer", "Close")}
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-[#f3f2f1] mb-1">
              {l("Mot de passe requis", "Password change required")}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-[#c8c6c4] leading-relaxed mb-3">
              {l(
                "Vous devez changer votre mot de passe après votre première connexion à la plateforme.",
                "You must change your temporary password after your first sign-in to the platform."
              )}
            </p>

            <Link
              href="/settings"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-800 hover:bg-blue-600 text-white text-[11px] font-semibold transition-colors"
            >
              {l("Aller aux paramètres", "Go to settings")}
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
