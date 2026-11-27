import { CheckCircle2, User, Mail, Phone, Camera, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { resolveMediaUrl } from "@/lib/media";

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
  photo?: string | null;
}

interface SuccessExtractingIdentityModalProps {
  data: IdentityData;
  onClose?: () => void;
  onConfirm?: () => void;
}

export default function SuccessExtractingIdentityModal({
  data,
  onClose,
}: SuccessExtractingIdentityModalProps) {
  const { l } = useLanguage();
  const notSpecified = l("Non spécifié", "Not specified");
  const fullName = data?.name?.full_name || notSpecified;
  const email = data?.email?.value || notSpecified;
  const phone = data?.phone?.value || notSpecified;
  const photoUrl = resolveMediaUrl(data?.photo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={l("Fermer", "Close")}
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
              {l("Importation terminée", "Upload complete")}
            </h2>
            <p className="text-sm font-medium text-gray-600">
              {l("Les informations ont été extraites avec succès.", "Information extracted successfully.")}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {photoUrl && (
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-green-200">
                <img
                  src={photoUrl}
                  alt={l("Photo du candidat", "Candidate photo")}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h3 className="text-sm font-semibold text-gray-800">{l("Données extraites", "Extracted data")}</h3>
          </div>

          <div className="space-y-4 pl-4 border-l-2 border-gray-100">
           
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-200 text-gray-500">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">{l("Nom complet", "Full name")}</p>
                <p className="text-sm font-semibold text-gray-900">{fullName}</p>
              </div>
            </div>

              <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-200 text-gray-500">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">{l("Adresse email", "Email address")}</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{email}</p>
              </div>
            </div>

             <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-200 text-gray-500">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">{l("Téléphone", "Phone")}</p>
                <p className="text-sm font-semibold text-gray-900">{phone}</p>
              </div>
            </div>

            {photoUrl && (
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-50 border border-gray-200 text-gray-500">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Photo</p>
                  <p className="text-xs font-medium text-green-600">{l("Photo extraite avec succès", "Photo extracted successfully")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}