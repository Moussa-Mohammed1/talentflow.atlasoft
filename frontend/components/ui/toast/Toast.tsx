"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  TriangleAlert,
  X,
} from "lucide-react";

import type { Toast as ToastType } from "@/stores/toast-store";

const DEFAULT_DURATION = 4000;

const config = {
  success: {
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
  },
  error: {
    icon: CircleAlert,
    iconColor: "text-rose-400",
  },
  warning: {
    icon: TriangleAlert,
    iconColor: "text-amber-400",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-400",
  },
  loading: {
    icon: Loader2,
    iconColor: "text-indigo-400",
  },
} as const;

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

export default function Toast({ toast, onRemove }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { icon: Icon, iconColor } = config[toast.type];

  const duration =
    toast.type === "loading" ? undefined : toast.duration ?? DEFAULT_DURATION;

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [onRemove, toast.id]);

  useEffect(() => {
    if (duration !== undefined) {
      timerRef.current = setTimeout(handleClose, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, handleClose]);

  return (
    <div
      role="alert"
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      className={`
        group pointer-events-auto relative rounded-lg flex w-full max-w-sm items-start gap-3
          border-white/[0.06] bg-zinc-900/90 p-3 pl-5
         backdrop-blur-xl 
        ${
          isExiting
            ? "animate-toast-exit motion-reduce:animate-none motion-reduce:opacity-0"
            : "animate-toast-enter motion-reduce:animate-none"
        }
      `}
    >
      

      <p className="flex-1 text-xs leading-5 text-zinc-100">
        {toast.message}
      </p>

      <button
        type="button"
        onClick={handleClose}
        className="shrink-0  p-1 text-zinc-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-zinc-300 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 group-hover:opacity-100"
        aria-label="Fermer la notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
