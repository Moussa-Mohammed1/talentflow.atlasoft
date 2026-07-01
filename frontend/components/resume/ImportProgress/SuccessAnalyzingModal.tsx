import { CheckCircle2, Code2, Layers, User } from "lucide-react";
import type {
  ResumeFullAnalysisResult,
  ResumeIdentityResult,
} from "@/hooks/useResumeImport";

interface SuccessAnalyzingModalProps {
  identityData: ResumeIdentityResult | null;
  analysisData: ResumeFullAnalysisResult | null;
}

export default function SuccessAnalyzingModal({
  identityData,
  analysisData,
}: SuccessAnalyzingModalProps) {
  const fullName = identityData?.name?.full_name || "Non spécifié";
  const skills = analysisData?.analysis?.flattened_skills ?? [];
  const technologies = analysisData?.analysis?.technologies ?? [];
  const competencies = analysisData?.analysis?.competencies ?? [];
  const previewSkills = skills.slice(0, 8);

  return (
    <div className="fixed overflow-hidden inset-0 z-50 flex items-center justify-center p-4   transition-all duration-300">
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex items-center p-6 border-b border-gray-100 space-x-4">
          <div className="relative flex items-center justify-center w-10 h-10 bg-green-50 rounded-full shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg text-left font-bold text-gray-900">
              Analyse terminée
            </h2>
            <p className="text-sm text-left font-medium text-gray-600">
              L&apos;identité et les compétences ont été extraites avec succès.
            </p>
          </div>
        </div>

      
        <div className="p-6 overflow-hidden space-y-8 custom-scrollbar">
          
        
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <h3 className="text-sm font-semibold text-gray-800">Candidat</h3>
            </div>
            <div className="pl-4 border-l-2 border-gray-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center text-left w-8 h-8 bg-gray-50  border border-gray-200 text-gray-500">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-left text-gray-500 uppercase tracking-wider mb-0.5">Nom complet</p>
                  <p className="text-sm font-semibold text-left text-gray-900">{fullName}</p>
                </div>
              </div>
            </div>
          </div>

          
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              <h3 className="text-sm font-semibold text-gray-800">Vue d&apos;ensemble</h3>
            </div>
            <div className="pl-4 border-l-2 border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="mrc bg-gray-50 border border-gray-100 p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Code2 className="w-4 h-4" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Technologies</p>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {technologies.length}
                  </p>
                </div>

                <div className="mrc bg-gray-50 border border-gray-100 p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Layers className="w-4 h-4" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Compétences</p>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {competencies.length}
                  </p>
                </div>

              </div>
            </div>
          </div>

          {previewSkills.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-800">Aperçu des compétences</h3>
              </div>
              <div className="flex flex-wrap gap-2 pl-4">
                {previewSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 bg-white text-gray-700 rounded-full text-sm font-medium border border-gray-200 shadow-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
        
       
      </div>
    </div>
  );
}
