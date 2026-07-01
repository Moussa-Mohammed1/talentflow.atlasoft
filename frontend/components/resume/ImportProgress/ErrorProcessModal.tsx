import { XCircle } from "lucide-react";
export default function ErrorProcessModal()
{
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
}