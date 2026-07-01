import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id" | "createdAt"> & { id?: string }) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, data: Partial<Omit<Toast, "id" | "createdAt">>) => void;
  clearAll: () => void;
}

let counter = 0;
const generateId = () => `toast-${++counter}-${Date.now()}`;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = toast.id ?? generateId();
    set((state) => ({
      toasts: [{ ...toast, id, createdAt: Date.now() }, ...state.toasts],
    }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  updateToast: (id, data) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, ...data } : t,
      ),
    }));
  },

  clearAll: () => set({ toasts: [] }),
}));
