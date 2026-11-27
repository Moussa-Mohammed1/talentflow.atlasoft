"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { translations, type AppLanguage } from "@/locales/translations";

export type { AppLanguage };

const LANGUAGE_STORAGE_KEY = "talentflow_language";
const LANGUAGE_EVENT = "talentflow-language-change";

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  locale: string;
  t: (typeof translations)[AppLanguage];
  l: (fr: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "fr",
  setLanguage: () => {},
  locale: "fr-FR",
  t: translations.fr,
  l: (fr) => fr,
});

function applyLanguageAttr(language: AppLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
}

function subscribeLanguage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANGUAGE_EVENT, callback);
  };
}

function getLanguageSnapshot(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "en" || saved === "fr") return saved;
  } catch {
    // ignore storage errors
  }
  return "fr";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getLanguageSnapshot,
    () => "fr" as AppLanguage
  );

  useEffect(() => {
    applyLanguageAttr(language);
  }, [language]);

  const setLanguage = useCallback((nextLang: AppLanguage) => {
    applyLanguageAttr(nextLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
      window.dispatchEvent(new Event(LANGUAGE_EVENT));
    } catch {
      // ignore storage errors
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      locale: language === "en" ? "en-US" : "fr-FR",
      t: translations[language],
      l: (fr: string, en: string) => (language === "en" ? en : fr),
    }),
    [language, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
