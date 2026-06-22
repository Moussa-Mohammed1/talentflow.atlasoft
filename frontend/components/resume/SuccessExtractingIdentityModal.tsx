import { CheckCircle2, User, Mail, Phone, X } from "lucide-react";

// Define the interface mapping exactly to your extracted schema
interface IdentityData {
  name?: {
    full_name?: string;
  };
  email?: {
    value?: string;
  };
  phone?: {
    value?: string;
  };
}

interface SuccessExtractingIdentityModalProps {
  data: IdentityData;
  onClose?: () => void;
  onConfirm?: () => void;
}

export default function SuccessExtractingIdentityModal({
  data,
  onClose,
  onConfirm,
}: SuccessExtractingIdentityModalProps) {
  const fullName = data?.name?.full_name || "Non spécifié";
  const email = data?.email?.value || "Non spécifié";
  const phone = data?.phone?.value || "Non spécifié";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
 
        <div className="flex items-center p-6 border-b border-gray-100 space-x-4">
          <div className="relative flex items-center justify-center w-10 h-10 bg-green-50 rounded-full shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Importation terminée
            </h2>
            <p className="text-sm font-medium text-gray-600">
              Les informations ont été extraites avec succès.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h3 className="text-sm font-semibold text-gray-800">Données extraites</h3>
          </div>

          <div className="space-y-4 pl-4 border-l-2 border-gray-100">
           
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-50 rounded-lg border border-gray-200 text-gray-500">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Nom complet</p>
                <p className="text-sm font-semibold text-gray-900">{fullName}</p>
              </div>
            </div>

              <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-50 rounded-lg border border-gray-200 text-gray-500">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Adresse email</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{email}</p>
              </div>
            </div>

             <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-50 rounded-lg border border-gray-200 text-gray-500">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Téléphone</p>
                <p className="text-sm font-semibold text-gray-900">{phone}</p>
              </div>
            </div>
          </div>
        </div>
 
    
     
      </div>
    </div>
  );
}