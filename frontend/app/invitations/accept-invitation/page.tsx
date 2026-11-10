"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { InvitationService } from "@/services/invitation.service";
import { useToastStore } from "@/stores/toast-store";

type PageState = "validating" | "invalid" | "ready" | "submitting" | "done";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToastStore();
  const token = searchParams.get("token") ?? "";

  const [pageState, setPageState] = useState<PageState>("validating");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  const [fullname, setFullname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isFormValid =
    fullname.trim().length >= 2 &&
    password.length >= 8 &&
    password === confirmPassword;

  useEffect(() => {
    if (!token) {
      setError("Lien d'invitation invalide. Aucun jeton de validation trouvé.");
      setPageState("invalid");
      return;
    }

    let cancelled = false;

    InvitationService.validateInvitation(token)
      .then((res) => {
        if (cancelled) return;
        setEmail(res.email);
        setPageState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        const detail =
          err?.response?.data?.detail ??
          "Cette invitation est invalide ou a expiré.";
        setError(detail);
        setPageState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPageState("submitting");

    try {
      await InvitationService.acceptInvitation({ token, fullname, password });

      addToast({
        type: "success",
        message: "Compte créé avec succès. Vous pouvez maintenant vous connecter.",
        duration: 6000,
      });

      setPageState("done");
      router.push("/login");
    } catch (err: any) {
      setPageState("ready");
      setError(
        err?.response?.data?.detail ??
          "Une erreur est survenue lors de la création du compte. Veuillez réessayer.",
      );
    }
  };

  if (pageState === "validating") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Vérification de votre invitation...</p>
        </div>
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center px-4">
        <div className="bg-white w-full max-w-md mx-auto mrc shadow-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Invitation invalide
          </h2>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-block bg-blue-900 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 mrc text-sm transition-colors"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white bg-cover bg-center bg-no-repeat text-slate-800 relative overflow-y-auto select-none">
      <div className="absolute inset-0 bg-black/10 z-0" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [bg-size:16px_16px] z-1" />

      <div className="min-h-screen w-full flex items-center justify-center relative z-10 px-4 py-12">
        <div className="bg-white w-full max-w-lg mx-auto mrc shadow-md p-6 sm:p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
              <img
                src="/images/logo.png"
                alt="Logo"
                className="w-full h-auto object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Accepter l&apos;invitation
              </h2>
              <p className="text-xs text-slate-500">
                Créez votre compte pour rejoindre TalentFlow
              </p>
            </div>
          </div>

          {email && (
            <div className="mb-6 p-3  bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium">
                Compte associé à
              </p>
              <p className="text-sm text-blue-900 font-semibold">{email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="text-red-500 font-bold mr-1">*</span>
                Nom complet
              </label>
              <input
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="Jean Dupont"
                required
                className="w-full px-4 py-2.5  border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="text-red-500 font-bold mr-1">*</span>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                required
                minLength={8}
                className="w-full px-4 py-2.5  border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                8 caractères minimum
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="text-red-500 font-bold mr-1">*</span>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Saisissez à nouveau le mot de passe"
                required
                minLength={8}
                className="w-full px-4 py-2.5  border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500">
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            {error && (
              <div className="p-3  bg-red-50 border border-red-100">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid || pageState === "submitting"}
              className={`
                w-full mt-2 py-3 px-4 font-semibold mrc text-sm transition-colors duration-200
                ${
                  !isFormValid || pageState === "submitting"
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-900 hover:bg-blue-700 text-white cursor-pointer"
                }
              `}
            >
              {pageState === "submitting"
                ? "Création en cours..."
                : "Créer mon compte"}
            </button>
          </form>

          <hr className="my-6 border-slate-100" />

          <p className="text-center text-xs text-slate-500">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-pulse text-slate-400 text-sm">Chargement...</div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
