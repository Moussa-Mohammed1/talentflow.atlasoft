"use client";

import { useCallback } from "react";

import { useToastStore, type ToastType } from "@/stores/toast-store";

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  const removeToast = useToastStore((s) => s.removeToast);
  const updateToast = useToastStore((s) => s.updateToast);
  const clearAll = useToastStore((s) => s.clearAll);

  const success = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: "success", message, duration }),
    [addToast],
  );

  const error = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: "error", message, duration }),
    [addToast],
  );

  const warning = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: "warning", message, duration }),
    [addToast],
  );

  const info = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: "info", message, duration }),
    [addToast],
  );

  const loading = useCallback(
    (message: string) => addToast({ type: "loading", message }),
    [addToast],
  );

  const promise = useCallback(
    async <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((err: unknown) => string);
      },
    ): Promise<T> => {
      const id = addToast({ type: "loading", message: messages.loading });
      try {
        const data = await promise;
        const message =
          typeof messages.success === "function"
            ? messages.success(data)
            : messages.success;
        updateToast(id, {
          type: "success",
          message,
          duration: 4000,
        });
        return data;
      } catch (err) {
        const message =
          typeof messages.error === "function"
            ? messages.error(err)
            : messages.error;
        updateToast(id, { type: "error", message, duration: 4000 });
        throw err;
      }
    },
    [addToast, updateToast],
  );

  return {
    success,
    error,
    warning,
    info,
    loading,
    updateToast,
    removeToast,
    clearAll,
    promise,
  };
}
