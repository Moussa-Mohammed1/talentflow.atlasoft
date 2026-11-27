"use client";
import { Suspense } from "react";
import Head from "next/head";
import LoginForm from "@/components/auth/LoginForm";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

export default function LoginPage() {
  const { language, setLanguage, l } = useLanguage();

  return (
    <>
      <Head>
        <title>{l("Connexion - TalentFlow", "Sign In - TalentFlow")}</title>
        <meta
          name="description"
          content={l("Page de connexion de la plateforme", "Platform login page")}
        />
      </Head>

      <div className="min-h-screen w-full bg-white dark:bg-[#141414] text-slate-800 dark:text-[#f3f2f1] relative overflow-x-hidden overflow-y-auto flex items-center justify-center py-10 px-6 sm:px-10 select-none">
        <Image
          src="/static/bg-login.svg"
          alt=""
          fill
          priority
          draggable={false}
          className="object-cover rotate-180 dark:opacity-15 dark:invert pointer-events-none select-none [-webkit-user-drag:none]"
        />
        <div className="fixed inset-0 bg-black/10 dark:bg-black/40 z-0 pointer-events-none" />
        <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] z-[1]" />

        {/* Subtle public language switcher */}
        <div className="fixed top-4 right-5 z-20 inline-flex items-center rounded-md border border-slate-200 dark:border-[#3b3a39] bg-white/90 dark:bg-[#252423]/90 backdrop-blur-sm p-0.5 text-xs font-semibold shadow-sm">
          <button
            type="button"
            onClick={() => setLanguage("fr")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              language === "fr"
                ? "bg-[#0078d4] text-white"
                : "text-slate-600 dark:text-[#c8c6c4] hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              language === "en"
                ? "bg-[#0078d4] text-white"
                : "text-slate-600 dark:text-[#c8c6c4] hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            EN
          </button>
        </div>

        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10">
          {/* Left Brand Column */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center text-center space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 sm:w-[72px] sm:h-[68px] overflow-hidden flex items-center justify-center shrink-0 pointer-events-none select-none">
                <img
                  src="/images/black-logo.png"
                  alt="Logo Atlasoft"
                  draggable={false}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain dark:hidden pointer-events-none select-none [-webkit-user-drag:none]"
                />
                <img
                  src="/images/white-logo.png"
                  alt="Logo Atlasoft"
                  draggable={false}
                  className="h-[110px] sm:h-[124px] w-auto max-w-none object-contain hidden dark:block pointer-events-none select-none [-webkit-user-drag:none]"
                />
              </div>

              <div className="flex flex-col items-start text-left">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  TalentFlow
                </span>
                <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-[#a19f9d] mt-1.5 leading-none">
                  BY ATLASOFT
                </span>
              </div>
            </div>

            <p className="text-black dark:text-[#f3f2f1] font-semibold text-xl sm:text-2xl max-w-md leading-relaxed text-center">
              {l(
                "Recrutement intelligent, automatisé et entièrement traçable.",
                "Intelligent, automated, and fully traceable recruitment."
              )}
            </p>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7 w-full flex items-center justify-center">
            <Suspense
              fallback={
                <div className="w-full max-w-[520px] h-64 flex items-center justify-center text-sm text-slate-400">
                  {l("Chargement...", "Loading...")}
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
