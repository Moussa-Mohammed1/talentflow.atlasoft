import { ModalProvider } from "@/context/ModalContext";
import ToastProvider from "@/components/ui/toast/ToastProvider";
import PasswordChangeBanner from "@/components/ui/PasswordChangeBanner";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentFlow",
  description: "Simple CV upload form for testing backend endpoints",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased [scroll:smooth] [scrollbar-width:none]">
      <body className="min-h-full [scrollbar-width:none] flex flex-col font-sans">
        <ModalProvider>
          <ToastProvider>
            {children}
            <PasswordChangeBanner />
          </ToastProvider>
        </ModalProvider>
      </body>
    </html>
  );
}
