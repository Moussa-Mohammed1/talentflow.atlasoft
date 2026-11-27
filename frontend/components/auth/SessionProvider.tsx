"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { restoreSession } from "@/lib/auth";
import { isPublicPath } from "@/lib/auth-routes";
import { SettingsService } from "@/services/settings.service";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuthStore } from "@/stores/auth.store";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { setLanguage, l } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const prefsSyncedRef = useRef(false);

  const publicRoute = isPublicPath(pathname);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user) {
        if (publicRoute) {
          prefsSyncedRef.current = false;
          return;
        }

        const valid = await restoreSession();
        if (cancelled) return;

        if (!valid) {
          prefsSyncedRef.current = false;
          router.replace("/login");
          return;
        }
      }

      if (!prefsSyncedRef.current) {
        prefsSyncedRef.current = true;
        try {
          const settings = await SettingsService.get();
          if (cancelled) return;
          const serverTheme = settings?.preferences?.theme;
          if (serverTheme === "dark" || serverTheme === "light") {
            setTheme(serverTheme);
          }
          const serverLang = settings?.preferences?.language;
          if (serverLang === "fr" || serverLang === "en") {
            setLanguage(serverLang);
          }
        } catch {
          // non-critical: keep local preferences
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, publicRoute, router, setTheme, setLanguage, user]);

  if (!publicRoute && !user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#141414] text-[#323130] dark:text-[#f3f2f1] font-atlasoft">
        <Loader2 className="h-6 w-6 animate-spin text-[#0078d4] dark:text-[#50e6ff]" />
        <span className="text-xs text-[#605e5c] dark:text-[#a19f9d]">
          {l("Vérification de la session...", "Verifying session...")}
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
