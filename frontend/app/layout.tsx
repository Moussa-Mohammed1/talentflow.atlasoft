import { ModalProvider } from "@/context/ModalContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import ToastProvider from "@/components/ui/toast/ToastProvider";
import SessionProvider from "@/components/auth/SessionProvider";
import PasswordChangeBanner from "@/components/ui/PasswordChangeBanner";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentFlow",
  description: "Intelligent recruitment and CV evaluation platform by Atlasoft",
};

const prefsInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('talentflow_theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    var lang = localStorage.getItem('talentflow_language');
    if (lang === 'en' || lang === 'fr') {
      document.documentElement.lang = lang;
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className="h-full antialiased [scroll:smooth] [scrollbar-width:none]">
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsInitScript }} />
      </head>
      <body className="min-h-full [scrollbar-width:none] flex flex-col font-sans bg-white text-[#323130] dark:bg-[#141414] dark:text-[#f3f2f1]">
        <LanguageProvider>
          <ThemeProvider>
            <ModalProvider>
              <ToastProvider>
                <SessionProvider>
                  {children}
                  <PasswordChangeBanner />
                </SessionProvider>
              </ToastProvider>
            </ModalProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
