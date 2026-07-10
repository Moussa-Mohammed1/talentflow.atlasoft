"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast-store";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState<"login" | "forgot">("login");
    const [forgotEmail, setForgotEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otpSent, setOtpSent] = useState(false);

    const isFormValid =
        email.trim() !== "" &&
        password.trim() !== "";
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const linkedin_redirect_url = process.env.NEXT_PUBLIC_LINKEDIN_LOGIN_URL;

    if (!linkedin_redirect_url) {
        throw new Error("LI redirect url is missing")
    }
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addToast } = useToastStore();

    const { setUser, setToken } = useAuthStore();

    useEffect(() => {
        const tokenParam = searchParams.get("token");
        if (tokenParam) {
            localStorage.setItem("access_token", tokenParam);
            document.cookie = `access_token=${tokenParam}; path=/; max-age=86400; SameSite=Lax`;
            useAuthStore.getState().setToken(tokenParam);
            AuthService.me().then((res) => {
                useAuthStore.getState().setUser(res.user);
                router.replace("/dashboard");
            }).catch(() => {
                router.replace("/login");
            });
            return;
        }
        if (searchParams.get("expired") === "true") {
            addToast({
                type: "warning",
                message: "session expiré, veuillez se connecter a nouveau",
                duration: 5000,
            });
        }
        if (searchParams.get("linkedin_error") === "unauthorized_email") {
            addToast({
                type: "error",
                message: "L'authentification via LinkedIn est réservée aux utilisateurs autorisés",
                duration: 5000,
            });
        }
    }, [searchParams, addToast]);

    const handleLogin = async (
        e: React.FormEvent<HTMLFormElement>,
    ) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {

        const response = await AuthService.login(
            email,
            password
        );

        const token = response.access_token;

        localStorage.setItem(
            "access_token",
            token
        );
        document.cookie = `access_token=${token}; path=/; max-age=86400; SameSite=Lax`;
        setToken(token);

        const user = await AuthService.me();
        console.log(user);

        setUser(response.user);
        router.push("/dashboard");

        } catch (err: any) {
        setError(
            err?.response?.data?.detail ||
            "Une erreur de connexion est survenue. Nous vous invitons à réessayer plus tard."
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
                message: "Si l'adresse email existe, un code de vérification vous a été envoyé.",
                duration: 5000,
            });
        } catch (err: any) {
            setError(
                err?.response?.data?.detail ||
                "Une erreur est survenue. Veuillez réessayer."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        setLoading(true);

        try {
            await AuthService.resetPassword(forgotEmail, otpCode, newPassword);
            addToast({
                type: "success",
                message: "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
                duration: 5000,
            });
            setMode("login");
            setOtpSent(false);
            setOtpCode("");
            setNewPassword("");
            setConfirmPassword("");
            setForgotEmail("");
        } catch (err: any) {
            setError(
                err?.response?.data?.detail ||
                "Une erreur est survenue. Veuillez réessayer."
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
            <div className="bg-white w-full max-w-lg mx-auto rounded-lg shadow-md p-6 sm:p-8 relative z-20">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">
                    Mot de passe oublié
                </h2>

                {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <span className="text-red-500 font-bold mr-1">*</span>
                                Adresse e-mail
                            </label>
                            <input
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                            />
                            <p className="text-xs text-slate-400 mt-1.5">
                                Format : exemple@mail.com
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={!forgotEmail.trim() || loading}
                            className={`
                                w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors duration-200
                                ${!forgotEmail.trim() || loading
                                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    : "bg-blue-800 hover:bg-blue-500 text-white cursor-pointer"
                                }
                            `}
                        >
                            {loading ? "Envoi en cours..." : "Envoyer le code"}
                        </button>

                        <button
                            type="button"
                            onClick={switchToLogin}
                            className="w-full text-center text-sm text-blue-600 hover:underline cursor-pointer"
                        >
                            Retour à la connexion
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <span className="text-red-500 font-bold mr-1">*</span>
                                Code de vérification (OTP)
                            </label>
                            <input
                                type="text"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                placeholder="000000"
                                required
                                maxLength={6}
                                className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-center text-lg tracking-[8px] font-mono"
                            />
                            <p className="text-xs text-slate-400 mt-1.5">
                                Saisissez le code à 6 chiffres reçu par email
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <span className="text-red-500 font-bold mr-1">*</span>
                                Nouveau mot de passe
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                            />
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
                                required
                                className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={!otpCode.trim() || !newPassword.trim() || !confirmPassword.trim() || loading}
                            className={`
                                w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors duration-200
                                ${!otpCode.trim() || !newPassword.trim() || !confirmPassword.trim() || loading
                                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    : "bg-blue-800 hover:bg-blue-500 text-white cursor-pointer"
                                }
                            `}
                        >
                            {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                        </button>

                        <button
                            type="button"
                            onClick={() => setOtpSent(false)}
                            className="w-full text-center text-sm text-blue-600 hover:underline cursor-pointer"
                        >
                            Modifier l'adresse email
                        </button>
                    </form>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white w-full max-w-lg mx-auto rounded-lg shadow-md p-6 sm:p-8 relative z-20">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Connexion
        </h2>

        <form
            onSubmit={handleLogin}
            className="space-y-5"
        >

            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="text-red-500 font-bold mr-1">
                *
                </span>
                Adresse e-mail
            </label>

            <input
                type="email"
                value={email}
                onChange={(e) =>
                setEmail(e.target.value)
                }
                required
                className="w-full px-4 py-2.5 mm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
            />

            <p className="text-xs text-slate-400 mt-1.5">
                Format : exemple@mail.com
            </p>
            </div>

            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="text-red-500 font-bold mr-1">
                *
                </span>
                Mot de passe
            </label>

            <input
                type="password"
                value={password}
                onChange={(e) =>
                setPassword(e.target.value)
                }
                required
                className="w-full mm px-4 py-2.5  border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
            />


            {error && (
            <p className="mt-1 text-sm text-red-600">
                {error}
            </p>
            )}

            <div className="mt-2">
            <button
                type="button"
                onClick={switchToForgot}
                className="text-xs font-medium text-blue-600 hover:underline transition-all cursor-pointer"
            >
                Mot de passe oublié ?
            </button>
                </div>
            </div>



            <button
                type="submit"
                disabled={!isFormValid || loading}
                className={`
                    w-full mt-2 py-3 px-4 rounded-lg font-semibold mrc text-sm transition-colors duration-200
                    ${
                    !isFormValid || loading
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-blue-800 hover:bg-blue-500 text-white cursor-pointer"
                    }
                `}
                >
                {loading ? "Connexion..." : "Se connecter"}
            </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-4 text-slate-400">ou continuer avec</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href = linkedin_redirect_url!;
          }}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <span>S&apos;authentifier avec LinkedIn</span>
        </button>
       <p className="text-xs pt-4 text-slate-500">
        <strong className="text-black">* Remarque :</strong> <br /> - L&apos;authentification via LinkedIn est réservée aux utilisateurs autorisés.
        <br />
            - Si c'est votre première visite sur la plateforme, vous ne pouvez pas vous authentifier à l'aide de LinkedIn        </p>
        <hr className="my-2 border-slate-100" />

        <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
            Besoin d'aide pour accéder à TalentFlow ?
            </h3>

            <p className="text-xs text-slate-500">
            Si vous ne disposez pas encore d'un compte ou de vos identifiants de connexion, veuillez demander un lien d'invitation auprès de votre responsable ou de votre administrateur de recrutement.
            </p>


        </div>
        </div>
    );
}
