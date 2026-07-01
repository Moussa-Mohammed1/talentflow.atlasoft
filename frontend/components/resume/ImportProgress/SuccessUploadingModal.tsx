import { CheckCircle2 } from "lucide-react";

export default function SuccessUploadingModal()
{
    return (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-600" />
            <h2 className="font-bold text-lg">
              CV importé avec succès
            </h2>
            <p className="text-slate-500">
              Préparation de l' analyse...
            </p>
          </>
        );
}