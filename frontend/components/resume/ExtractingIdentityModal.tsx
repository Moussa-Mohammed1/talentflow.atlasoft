import { useModal } from "@/context/ModalContext";
import { Loader2, User, Mail, Phone } from "lucide-react";

interface ExtractingIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExtractingIdentityModal({
  isOpen,
  onClose,
}: ExtractingIdentityModalProps) {
  const { setModalOpen } = useModal();

  const handleClose = () => {
    setModalOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4   transition-all duration-300">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-visible">
        
        
        <div className="flex items-center p-6 border-b border-gray-100 space-x-4">
          <div className="relative flex items-center justify-center w-10 h-10 bg-amber-50 rounded-full shrink-0">
            <Loader2 className="w-5 h-5 text-amber-600 animate-spin"/>
          </div>
          <div>
            <h2 className="text-lg text-left font-bold text-gray-900">
              Extraction de l&apos;identité
            </h2>
            <p className="text-left text-sm font-medium text-gray-600">
              Analyse du CV en cours... Veuillez patienter.
            </p>
          </div>
        </div>

        
        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-semibold text-gray-800">Informations Personnelles</h3>
          </div>

          <div className="space-y-4 pl-4 border-l-2 border-gray-100">
            
            <div className="flex items-center gap-4 animate-pulse">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-50 rounded-lg border border-gray-200 text-gray-400">
                <User className="w-4 h-4"/>
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-40" />
              </div>
            </div>

            
            <div className="flex items-center gap-4 animate-pulse">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-50 rounded-lg border border-gray-200 text-gray-400">
                <Mail className="w-4 h-4"/>
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-gray-200 rounded w-20" />
                <div className="h-3 bg-gray-200 rounded w-48" />
              </div>
            </div>

            
            <div className="flex items-center gap-4 animate-pulse">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-50 rounded-lg border border-gray-200 text-gray-400">
                <Phone className="w-4 h-4"/>
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-gray-200 rounded w-14" />
                <div className="h-3 bg-gray-200 rounded w-32" />
              </div>
            </div>
          </div>
        </div>

        
        
        <div className="w-full bg-gray-100 rounded-b-2xl h-1.5 overflow-hidden">
          <div className="bg-amber-500 h-1.5 rounded-full animate-[progress_2s_ease-in-out_infinite]"></div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes progress {
            0% { width: 0%; transform: translateX(-100%); }
            50% { width: 50%; }
            100% { width: 100%; transform: translateX(100%); }
          }
        `}} />

      </div>
    </div>
  );
}