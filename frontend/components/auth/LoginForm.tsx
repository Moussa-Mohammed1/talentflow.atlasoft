"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast-store";
import { useLanguage } from "@/context/LanguageContext";
import { getErrorMessage } from "@/lib/api-error";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState<"login" | "forgot">("login");
    const [forgotEmail, setForgotEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otpSent, setOtpSent] = useState(false);

    const { l } = useLanguage();
    const isFormValid =
        email.trim() !== "" &&
        password.trim() !== "";
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const linkedin_redirect_url = process.env.NEXT_PUBLIC_LINKEDIN_LOGIN_URL;

    if (!linkedin_redirect_url) {
        throw new Error("LI redirect url is missing");
    }
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addToast } = useToastStore();

    const { setUser } = useAuthStore();

    useEffect(() => {
        const oauthCode = searchParams.get("oauth_code");
        if (oauthCode) {
            AuthService.exchangeOAuthCode(oauthCode)
                .then((res) => {
                    if (res?.user) {
                        useAuthStore.getState().setUser(res.user);
                    }
                    router.replace("/dashboard");
                })
                .catch(() => {
                    router.replace("/login");
                });
            return;
        }
        if (searchParams.get("expired") === "true") {
            addToast({
                type: "warning",
                message: l(
                  "Session expirée, veuillez vous connecter à nouveau",
                  "Session expired, please sign in again"
                ),
                duration: 5000,
            });
        }
        if (searchParams.get("linkedin_error") === "unauthorized_email") {
            addToast({
                type: "error",
                message: l(
                  "L'authentification via LinkedIn est réservée aux utilisateurs autorisés",
                  "LinkedIn authentication is restricted to authorized users"
                ),
                duration: 5000,
            });
        }
    }, [searchParams, addToast, router, l]);

    const handleLogin = async (
        e: React.FormEvent<HTMLFormElement>,
    ) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await AuthService.login(email, password);
            setUser(response.user);
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(
                getErrorMessage(
                    err,
                    l(
                      "Une erreur de connexion est survenue. Nous vous invitons à réessayer plus tard.",
                      "A connection error occurred. Please try again later."
                    )
                )
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await AuthService.forgotPassword(forgotEmail);
            setOtpSent(true);
            addToast({
                type: "success",
                message: l(
                  "Si l'adresse email existe, un code de vérification vous a été envoyé.",
                  "If the email address exists, a verification code has been sent."
                ),
                duration: 5000,
            });
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setError(
                detail ||
                l("Une erreur est survenue. Veuillez réessayer.", "An error occurred. Please try again.")
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError(l("Les mots de passe ne correspondent pas.", "Passwords do not match."));
            return;
        }

        if (newPassword.length < 6) {
            setError(
              l(
                "Le mot de passe doit contenir au moins 6 caractères.",
                "Password must be at least 6 characters long."
              )
            );
            return;
        }

        setLoading(true);

        try {
            await AuthService.resetPassword(forgotEmail, otpCode, newPassword);
            addToast({
                type: "success",
                message: l(
                  "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
                  "Password reset successfully. You can now sign in."
                ),
                duration: 5000,
            });
            setMode("login");
            setOtpSent(false);
            setOtpCode("");
            setNewPassword("");
            setConfirmPassword("");
            setForgotEmail("");
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setError(
                detail ||
                l("Une erreur est survenue. Veuillez réessayer.", "An error occurred. Please try again.")
            );
        } finally {
            setLoading(false);
        }
    };

    const switchToForgot = () => {
        setForgotEmail(email);
        setMode("forgot");
        setError("");
        setOtpSent(false);
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
    };

    const switchToLogin = () => {
        setMode("login");
        setError("");
        setOtpSent(false);
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
    };

    if (mode === "forgot") {
        return (
            <div className="bg-white dark:bg-[#252423] border border-slate-200/80 dark:border-[#3b3a39] w-full max-w-[520px] mx-auto rounded-xl shadow-xl p-8 sm:p-10 relative z-20">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                    {l("Mot de passe oublié", "Forgot password")}
                </h2>

                {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-[#c8c6c4] mb-2">
                                <span className="text-red-500 font-bold mr-1">*</span>
                                {l("Adresse e-mail", "Email address")}
                            </label>
                            <input
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-md bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-white border border-slate-300 dark:border-[#484644] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-[15px]"
                            />
                            <p className="text-xs text-slate-400 dark:text-[#a19f9d] mt-1.5">
                                {l("Format : exemple@mail.com", "Format: example@mail.com")}
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={!forgotEmail.trim() || loading}
                            className={`
                                w-full py-3.5 px-4 rounded-lg font-semibold text-[15px] transition-colors duration-200
                                ${!forgotEmail.trim() || loading
                                    ? "bg-slate-200 dark:bg-[#323130] text-slate-400 dark:text-[#797775] cursor-not-allowed"
                                    : "bg-blue-800 dark:bg-[#0078d4] hover:bg-blue-500 dark:hover:bg-[#106ebe] text-white cursor-pointer"
                                }
                            `}
                        >
                            {loading ? l("Envoi en cours...", "Sending...") : l("Envoyer le code", "Send code")}
                        </button>

                        <button
                            type="button"
                            onClick={switchToLogin}
                            className="w-full text-center text-sm text-blue-600 dark:text-[#4ea8fe] hover:underline cursor-pointer pt-1"
                        >
                            {l("Retour à la connexion", "Back to sign in")}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-[#c8c6c4] mb-2">
                                <span className="text-red-500 font-bold mr-1">*</span>
                                {l("Code de vérification (OTP)", "Verification code (OTP)")}
                            </label>
                            <input
                                type="text"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                placeholder="000000"
                                required
                                maxLength={6}
                                className="w-full px-4 py-3 rounded-md bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-white border border-slate-300 dark:border-[#484644] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-center text-lg tracking-[8px] font-mono"
                            />
                            <p className="text-xs text-slate-400 dark:text-[#a19f9d] mt-1.5">
                                {l("Saisissez le code à 6 chiffres reçu par email", "Enter the 6-digit code received by email")}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-[#c8c6c4] mb-2">
                                <span className="text-red-500 font-bold mr-1">*</span>
                                {l("Nouveau mot de passe", "New password")}
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-md bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-white border border-slate-300 dark:border-[#484644] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-[15px]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-[#c8c6c4] mb-2">
                                <span className="text-red-500 font-bold mr-1">*</span>
                                {l("Confirmer le mot de passe", "Confirm password")}
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-md bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-white border border-slate-300 dark:border-[#484644] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-[15px]"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={!otpCode.trim() || !newPassword.trim() || !confirmPassword.trim() || loading}
                            className={`
                                w-full py-3.5 px-4 rounded-lg font-semibold text-[15px] transition-colors duration-200
                                ${!otpCode.trim() || !newPassword.trim() || !confirmPassword.trim() || loading
                                    ? "bg-slate-200 dark:bg-[#323130] text-slate-400 dark:text-[#797775] cursor-not-allowed"
                                    : "bg-blue-800 dark:bg-[#0078d4] hover:bg-blue-500 dark:hover:bg-[#106ebe] text-white cursor-pointer"
                                }
                            `}
                        >
                            {loading
                              ? l("Réinitialisation...", "Resetting...")
                              : l("Réinitialiser le mot de passe", "Reset password")}
                        </button>

                        <button
                            type="button"
                            onClick={() => setOtpSent(false)}
                            className="w-full text-center text-sm text-blue-600 dark:text-[#4ea8fe] hover:underline cursor-pointer pt-1"
                        >
                            {l("Modifier l'adresse email", "Change email address")}
                        </button>
                    </form>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#252423] border border-slate-200/80 dark:border-[#3b3a39] w-full max-w-[520px] mx-auto rounded-lg shadow-xl p-8 sm:p-10 relative z-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-7">
            {l("Connexion", "Sign in")}
        </h2>

        <form onSubmit={handleLogin} className="space-y-5">
            <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-[#c8c6c4] mb-2">
                <span className="text-red-500 font-bold mr-1">*</span>
                {l("Adresse e-mail", "Email address")}
            </label>

            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-md bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-white border border-slate-300 dark:border-[#484644] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-[15px]"
            />

            <p className="text-xs text-slate-400 dark:text-[#a19f9d] mt-1.5">
                {l("Format : exemple@mail.com", "Format: example@mail.com")}
            </p>
            </div>

            <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-[#c8c6c4] mb-2">
                <span className="text-red-500 font-bold mr-1">*</span>
                {l("Mot de passe", "Password")}
            </label>

            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-md bg-white dark:bg-[#1b1a19] text-slate-900 dark:text-white border border-slate-300 dark:border-[#484644] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-[15px]"
            />

            {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
            </p>
            )}

            <div className="mt-2.5">
            <button
                type="button"
                onClick={switchToForgot}
                className="text-sm font-medium text-blue-600 dark:text-[#4ea8fe] hover:underline transition-all cursor-pointer"
            >
                {l("Mot de passe oublié ?", "Forgot password?")}
            </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={!isFormValid || loading}
                className={`
                    w-full mt-2 py-3.5 px-4 rounded-lg font-semibold text-[15px] transition-colors duration-200
                    ${
                    !isFormValid || loading
                        ? "bg-slate-200 dark:bg-[#323130] text-slate-400 dark:text-[#797775] cursor-not-allowed"
                        : "bg-blue-800 dark:bg-[#0078d4] hover:bg-blue-500 dark:hover:bg-[#106ebe] text-white cursor-pointer"
                    }
                `}
                >
                {loading ? l("Connexion...", "Signing in...") : l("Se connecter", "Sign in")}
            </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-[#3b3a39]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-[#252423] px-4 text-slate-400 dark:text-[#a19f9d]">
              {l("ou continuer avec", "or continue with")}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href = linkedin_redirect_url!;
          }}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-slate-300 dark:border-[#484644] rounded-lg text-[15px] font-medium text-slate-700 dark:text-[#f3f2f1] bg-white dark:bg-[#1b1a19] hover:bg-slate-50 dark:hover:bg-[#323130] hover:border-slate-400 transition-all cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <span>{l("S'authentifier avec LinkedIn", "Sign in with LinkedIn")}</span>
        </button>

        <div className="pt-5 space-y-3">
          <p className="text-xs text-slate-500 dark:text-[#a19f9d] leading-relaxed">
            <strong className="text-slate-900 dark:text-white">{l("* Remarque :", "* Note:")}</strong> <br />
            - {l(
              "L'authentification via LinkedIn est réservée aux utilisateurs autorisés.",
              "LinkedIn authentication is restricted to authorized users."
            )} <br />
            - {l(
              "Si c'est votre première visite sur la plateforme, vous ne pouvez pas vous authentifier à l'aide de LinkedIn",
              "If this is your first visit to the platform, you cannot authenticate using LinkedIn."
            )}
          </p>

          <hr className="border-slate-200 dark:border-[#3b3a39]" />

          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {l("Besoin d'aide pour accéder à TalentFlow ?", "Need help accessing TalentFlow?")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#a19f9d] leading-relaxed">
              {l(
                "Si vous ne disposez pas encore d'un compte ou de vos identifiants de connexion, veuillez demander un lien d'invitation auprès de votre responsable ou de votre administrateur de recrutement.",
                "If you do not yet have an account or sign-in credentials, please request an invitation link from your manager or recruitment administrator."
              )}
            </p>
          </div>
        </div>
        </div>
    );
}
