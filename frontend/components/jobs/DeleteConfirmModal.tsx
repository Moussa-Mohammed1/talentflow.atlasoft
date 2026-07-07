import { Loader, TriangleAlert, X } from "lucide-react";

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
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
      <div className="w-full max-w-sm mrc border border-gray-200/80 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            Confirmer la suppression
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center mrc bg-red-50 text-red-500">
            <TriangleAlert size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              Supprimer l&apos;offre
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer <strong>&quot;{title}&quot;</strong>&nbsp;?
              Cette action est irréversible.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? <Loader className="h-4 w-4 animate-spin" /> : <TriangleAlert size={14} />}
            {isDeleting ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
