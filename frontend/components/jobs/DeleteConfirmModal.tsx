"use client";

import { Loader, TriangleAlert, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function DeleteConfirmModal({
  title,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  title: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t, l } = useLanguage();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/30 dark:bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm mrc border border-gray-200/80 dark:border-[#3b3a39] bg-white dark:bg-[#252423] shadow-xl">
        <div className="border-b border-gray-100 dark:border-[#3b3a39] px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-[#f3f2f1]">
            {l("Confirmer la suppression", "Confirm deletion")}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-[#f3f2f1] p-1 hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center mrc bg-red-50 dark:bg-rose-950/40 text-red-500 dark:text-rose-400">
            <TriangleAlert size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-[#f3f2f1] mb-1">
              {l("Supprimer l'offre", "Delete job offer")}
            </p>
            <p className="text-xs text-gray-500 dark:text-[#a19f9d] leading-relaxed">
              {l(
                `Êtes-vous sûr de vouloir supprimer "${title}" ? Cette action est irréversible.`,
                `Are you sure you want to delete "${title}"? This action cannot be undone.`
              )}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-[#3b3a39] bg-gray-50/70 dark:bg-[#1b1a19] px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="border border-gray-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#d2d0ce] shadow-xs hover:bg-gray-50 dark:hover:bg-[#323130] transition-colors disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? <Loader className="h-4 w-4 animate-spin" /> : <TriangleAlert size={14} />}
            {isDeleting ? l("Suppression...", "Deleting...") : t.common.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
