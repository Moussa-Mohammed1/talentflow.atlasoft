import { 
    Loader2,

 } from "lucide-react";
export default function UploadingModal()
{
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
}