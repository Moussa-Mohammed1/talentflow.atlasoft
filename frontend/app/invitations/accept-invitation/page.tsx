"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { InvitationService } from "@/services/invitation.service";
import { useToastStore } from "@/stores/toast-store";
import { useLanguage } from "@/context/LanguageContext";

type PageState = "validating" | "invalid" | "ready" | "submitting" | "done";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToastStore();
  const { language, setLanguage, l } = useLanguage();
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
      setError(
        l(
          "Lien d'invitation invalide. Aucun jeton de validation trouvé.",
          "Invalid invitation link. No validation token found."
        )
      );
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
          l(
            "Cette invitation est invalide ou a expiré.",
            "This invitation is invalid or has expired."
          );
        setError(detail);
        setPageState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [token, l]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPageState("submitting");

    try {
      await InvitationService.acceptInvitation({ token, fullname, password });

      addToast({
        type: "success",
        message: l(
          "Compte créé avec succès. Vous pouvez maintenant vous connecter.",
          "Account created successfully. You can now sign in."
        ),
        duration: 6000,
      });

      setPageState("done");
      router.push("/login");
    } catch (err: unknown) {
      setPageState("ready");
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(
        detail ??
          l(
            "Une erreur est survenue lors de la création du compte. Veuillez réessayer.",
            "An error occurred while creating the account. Please try again."
          )
      );
    }
  };

  if (pageState === "validating") {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-[#1b1a19] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-900 dark:border-[#0078d4] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-[#a19f9d]">
            {l("Vérification de votre invitation...", "Verifying your invitation...")}
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-[#1b1a19] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-[#252423] border border-transparent dark:border-[#3b3a39] w-full max-w-md mx-auto mrc shadow-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            {l("Invitation invalide", "Invalid invitation")}
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#c8c6c4] mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-block bg-blue-900 dark:bg-[#0078d4] hover:bg-blue-700 dark:hover:bg-[#106ebe] text-white font-semibold py-2.5 px-6 mrc text-sm transition-colors"
          >
            {l("Retour à la connexion", "Back to sign in")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#1b1a19] bg-cover bg-center bg-no-repeat text-slate-800 dark:text-[#f3f2f1] relative overflow-y-auto select-none">
      <div className="absolute inset-0 bg-black/10 dark:bg-black/30 z-0" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [bg-size:16px_16px] z-1" />

      <div className="fixed top-4 right-5 z-20 inline-flex items-center rounded-md border border-slate-200 dark:border-[#3b3a39] bg-white/90 dark:bg-[#252423]/90 backdrop-blur-sm p-0.5 text-xs font-semibold shadow-sm">
        <button
          type="button"
          onClick={() => setLanguage("fr")}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
            language === "fr" ? "bg-[#0078d4] text-white" : "text-slate-600 dark:text-[#c8c6c4]"
          }`}
        >
          FR
        </button>
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
            language === "en" ? "bg-[#0078d4] text-white" : "text-slate-600 dark:text-[#c8c6c4]"
          }`}
        >
          EN
        </button>
      </div>

      <div className="min-h-screen w-full flex items-center justify-center relative z-10 px-4 py-12">
        <div className="bg-white dark:bg-[#252423] border border-transparent dark:border-[#3b3a39] w-full max-w-lg mx-auto mrc shadow-md p-6 sm:p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
              <img
                src="/images/black-logo.png"
                alt="Logo"
                className="w-full h-auto object-contain dark:hidden"
              />
              <img
                src="/images/white-logo.png"
                alt="Logo"
                className="w-full h-auto object-contain hidden dark:block"
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {l("Accepter l'invitation", "Accept invitation")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#a19f9d]">
                {l("Créez votre compte pour rejoindre TalentFlow", "Create your account to join TalentFlow")}
              </p>
            </div>
          </div>

          {email && (
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800/60">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {l("Compte associé à", "Account linked to")}
              </p>
              <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold">{email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-[#c8c6c4] mb-1.5">
                <span className="text-red-500 font-bold mr-1">*</span>
                {l("Nom complet", "Full name")}
              </label>
              <input
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder={l("Jean Dupont", "John Doe")}
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#797775] border border-slate-200 dark:border-[#3b3a39] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-[#c8c6c4] mb-1.5">
                <span className="text-red-500 font-bold mr-1">*</span>
                {l("Mot de passe", "Password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={l("Minimum 8 caractères", "Minimum 8 characters")}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#797775] border border-slate-200 dark:border-[#3b3a39] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
              />
              <p className="text-xs text-slate-400 dark:text-[#a19f9d] mt-1.5">
                {l("8 caractères minimum", "8 characters minimum")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-[#c8c6c4] mb-1.5">
                <span className="text-red-500 font-bold mr-1">*</span>
                {l("Confirmer le mot de passe", "Confirm password")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={l("Saisissez à nouveau le mot de passe", "Re-enter password")}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#797775] border border-slate-200 dark:border-[#3b3a39] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {l("Les mots de passe ne correspondent pas.", "Passwords do not match.")}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800/60">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid || pageState === "submitting"}
              className={`
                w-full mt-2 py-3 px-4 font-semibold mrc text-sm transition-colors duration-200
                ${
                  !isFormValid || pageState === "submitting"
                    ? "bg-slate-200 dark:bg-[#323130] text-slate-400 dark:text-[#797775] cursor-not-allowed"
                    : "bg-blue-900 dark:bg-[#0078d4] hover:bg-blue-700 dark:hover:bg-[#106ebe] text-white cursor-pointer"
                }
              `}
            >
              {pageState === "submitting"
                ? l("Création en cours...", "Creating account...")
                : l("Créer mon compte", "Create my account")}
            </button>
          </form>

          <hr className="my-6 border-slate-100 dark:border-[#3b3a39]" />

          <p className="text-center text-xs text-slate-500 dark:text-[#a19f9d]">
            {l("Vous avez déjà un compte ?", "Already have an account?")}{" "}
            <Link href="/login" className="text-blue-600 dark:text-[#4ea8fe] hover:underline font-medium">
              {l("Se connecter", "Sign in")}
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#1b1a19] dark:to-[#1b1a19]">
        <div className="animate-pulse text-slate-400 dark:text-[#a19f9d] text-sm">Loading...</div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
