import { useState } from "react";
import { Trash2, Loader2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  fileName: string;
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, fileName }: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
            <Trash2 size={22} className="text-red-500" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">Supprimer le CV</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement ce CV ?
            </p>
            <p className="text-xs font-semibold text-slate-700 mt-1.5 truncate max-w-[260px] mx-auto">
              {fileName}
            </p>
            <p className="text-[11px] text-red-500 font-medium mt-2">
              Cette action est irréversible.
            </p>
          </div>

          <div className="flex gap-2 w-full mt-1">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 size={13} />
                  Supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
