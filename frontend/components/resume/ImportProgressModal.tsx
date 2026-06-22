import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { ImportStatus } from "@/hooks/useResumeImport";
import { useModal } from "@/context/ModalContext";
import { useEffect } from "react";
interface ImportProgressModalProps {
  status: ImportStatus;
  onClose: () => void;
}

export default function ImportProgressModal({
  status,
  onClose,
}: ImportProgressModalProps) {
  const { setModalOpen } = useModal();

  useEffect(() => {
    setModalOpen(true);

    return () => {
      setModalOpen(false);
    };
  }, [setModalOpen]);

  const canClose = status === "success" || status === "error";

  const renderContent = () => {
    switch (status) {
      case "uploading":
        return (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-yellow-600" />
            <h2 className="font-bold text-lg">
              Importation du CV...
            </h2>
            <p className="text-slate-500">
              Téléversement du document.
            </p>
          </>
        );

      case "uploaded":
        return (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-600" />
            <h2 className="font-bold text-lg">
              CV importé avec succès
            </h2>
            <p className="text-slate-500">
              Préparation de l&apos;analyse...
            </p>
          </>
        );

      case "extracting":
        return (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-yellow-600" />
            <h2 className="font-bold text-lg">
              Extraction de l&apos;identité
            </h2>
            <p className="text-slate-500">
              Analyse du CV en cours...
            </p>
          </>
        );

      case "success":
        return (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-600" />
            <h2 className="font-bold text-lg">
              Importation terminée
            </h2>
            <p className="text-slate-500">
              Les informations ont été extraites avec succès.
            </p>
          </>
        );

      case "error":
        return (
          <>
            <XCircle className="w-10 h-10 text-red-600" />
            <h2 className="font-bold text-lg">
              Une erreur est survenue
            </h2>
            <p className="text-slate-500">
              Impossible d&apos;importer le CV.
            </p>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed [scrollbar-width:none] inset-0 bg-[#ebeaea] flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-white rounded-xl shadow-xl p-8 w-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          {renderContent()}
          {canClose && (
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
