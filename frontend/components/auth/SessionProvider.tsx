"use client";

import { useEffect } from "react";
import { restoreSession } from "@/lib/auth";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    restoreSession();
  }, []);

  return <>{children}</>;
}
