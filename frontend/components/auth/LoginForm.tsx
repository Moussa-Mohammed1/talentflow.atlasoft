"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast-store";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

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
                className="w-full px-4 py-2.5 rounded-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
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
                className="w-full rounded-sm px-4 py-2.5  border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
            />


            {error && (
            <p className="mt-1 text-sm text-red-600">
                {error}
            </p>
            )}

            <div className="mt-2">
            <a
                href="#"
                className="text-xs font-medium text-blue-600 hover:underline transition-all"
            >
                Mot de passe oublié ?
            </a>
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

        <hr className="my-6 border-slate-100" />

        <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
            Besoin d’aide pour accéder à TalentFlow ?
            </h3>

            <p className="text-xs text-slate-500">
            Si vous ne disposez pas encore d’un
            compte ou de vos identifiants de
            connexion, veuillez contacter :
            </p>

            <ul className="space-y-2 text-xs text-slate-600 pl-1">
            <li className="flex items-start">
                <span className="mr-2 text-slate-400">
                •
                </span>
                <span>
                votre responsable ou administrateur
                si vous êtes un recruteur
                </span>
            </li>

           
            </ul>
        </div>
        </div>
    );
}