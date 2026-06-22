import type {
  ImportStatus,
  ResumeAnalysisResult,
  ResumeIdentityResult,
} from "@/hooks/useResumeImport";
import { useModal } from "@/context/ModalContext";
import { useEffect } from "react";
import UploadingModal from "./UploadingModal";
import SuccessUploadingModal from "./SuccessUploadingModal";
import ExtractingIdentityModal from "./ExtractingIdentityModal";
import SuccessExtractingIdentityModal from "./SuccessExtractingIdentityModal";
import SuccessAnalyzingModal from "./SuccessAnalyzingModal";
import ErrorProcessModal from "./ErrorProcessModal";
import AnalyzingResumeModal from "./AnalyzingResumeModal";
import { X } from "lucide-react";

interface ImportProgressModalProps {
  status: ImportStatus;
  identityData: ResumeIdentityResult | null;
  analysisData: ResumeAnalysisResult | null;
  onClose: () => void;
}

export default function ImportProgressModal({
  status,
  identityData,
  analysisData,
  onClose,
}: ImportProgressModalProps) {
  const { setModalOpen } = useModal();

  useEffect(() => {
    setModalOpen(true);

    return () => {
      setModalOpen(false);
    };
  }, [setModalOpen]);

  const renderContent = () => {
    switch (status) {
      case "uploading":
        return <UploadingModal />;

      case "uploaded":
        return <SuccessUploadingModal />;

      case "extracting":
        return identityData ? (
          <SuccessExtractingIdentityModal data={identityData} onClose={onClose} />
        ) : (
          <ExtractingIdentityModal 
            isOpen
            onClose={onClose}
          />
        );
      case "analyzing":
        return <AnalyzingResumeModal/>
      case "success":
        return (
          <SuccessAnalyzingModal
            identityData={identityData}
            analysisData={analysisData}
          />
        );

      case "error":
        return <ErrorProcessModal />;

      default:
        return null;
    }
  };

  return (
    <div className="fixed [scrollbar-width:none] inset-0 bg-white/50 backdrop-blur-xl flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="group fixed right-5 top-5 z-[60]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le modal"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-yellow-200 bg-black text-yellow-500 shadow-lg transition-colors hover:text-yellow-700 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="pointer-events-none absolute right-0 top-full mt-2 w-max max-w-xs rounded-lg bg-gray-900 px-3 py-2 text-center text-xs font-medium text-amber-400 opacity-0 invisible shadow-lg transition-all duration-200 group-hover:opacity-100 group-hover:visible">
          Fermer le modal n&apos;affectera pas le processus d&apos;extraction.
          <div className="absolute bottom-full right-3 border-4 border-transparent border-b-gray-900" />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-xl p-8 w-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
