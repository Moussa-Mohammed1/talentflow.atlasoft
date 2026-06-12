"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const isFormValid =
        email.trim() !== "" &&
        password.trim() !== "";
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const router = useRouter();

    const { setUser, setToken } = useAuthStore();

    const handleLogin = async (
        e: React.FormEvent<HTMLFormElement>,
    ) => {
        e.preventDefault();
        console.log("starting");
        
        setError("");
        setLoading(true);

        try {
            console.log("calling api");
            
        const response = await AuthService.login(
            email,
            password
        );
        console.log(response);
        
        const token = response.access_token;

        localStorage.setItem(
            "access_token",
            token
        );
        document.cookie = `access_token=${token}; path=/; max-age=86400; SameSite=Lax`;
        setToken(token);

        const user = await AuthService.me();

        setUser(response.user);

        router.push("/dashboard");
        console.log("failed to re")

        } catch (err: any) {
        setError(
            err?.response?.data?.detail ||
            "Adresse e-mail ou mot de passe incorrect."
        );
        } finally {
        setLoading(false);
        }
    };

    return (
        <div className="bg-white w-full max-w-lg mx-auto rounded-xl shadow-md p-6 sm:p-8 relative z-20">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Connexion
        </h2>

        <form
            onSubmit={handleLogin}
            className="space-y-5"
        >
            {/* Email */}
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
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
            />

            <p className="text-xs text-slate-400 mt-1.5">
                Format : exemple@mail.com
            </p>
            </div>

            {/* Password */}
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
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
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

        
            {/* Submit */}
            <button
                type="submit"
                disabled={!isFormValid || loading}
                className={`
                    w-full mt-2 py-3 px-4 font-semibold rounded-xl text-sm transition-colors duration-200
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