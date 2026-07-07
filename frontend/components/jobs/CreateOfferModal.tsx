import { Loader, Save, X } from "lucide-react";

export function CreateOfferModal({
  description,
  isSubmitting,
  onDescriptionChange,
  onSubmit,
  onClose,
}: {
  description: string;
  isSubmitting: boolean;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden mrc border border-gray-200/80 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Nouvelle offre d&apos;emploi
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Générez une offre à partir d&apos;une description
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="job-description"
              className="block text-xs font-semibold text-gray-700 mb-1.5"
            >
              Description du poste
            </label>
            <textarea
              id="job-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Entrez la description du poste ici..."
              rows={6}
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Veuillez entrer la description du poste, le système gérera les
              détails du poste en utilisant l&apos;intelligence artificielle.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!description.trim() || isSubmitting}
            className="inline-flex items-center gap-2 bg-white border text-black px-4 py-2 text-sm font-medium hover:text-white shadow-xs hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSubmitting ? "Génération..." : "Enregistrer l'offre"}
          </button>
        </div>
      </div>
    </div>
  );
}
