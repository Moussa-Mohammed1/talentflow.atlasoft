"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { X, ArrowRight, CircleAlert, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";

const STORAGE_KEY = "password_banner_dismissed";

export default function PasswordChangeBanner() {
  const user = useAuthStore((s) => s.user);
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
      <div className="relative bg-white border border-amber-200 mrc shadow-lg p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1  text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8  rounded-full flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-600" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 mb-1">
              Mot de passe requis
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
              Vous devez changer votre première mot de passe après votre première connexion aux plateform.
            </p>

            <Link
              href="/profile"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1.5 px-3 py-1.5  bg-blue-800 hover:bg-blue-600 text-white text-[11px] font-semibold transition-colors"
            >
              Aller au profil
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
