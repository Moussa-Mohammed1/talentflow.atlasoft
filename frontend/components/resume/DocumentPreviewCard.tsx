"use client";

import { Calendar, FileText } from "lucide-react";
import { DocumentListItem } from "@/services/resume.service";

interface DocumentPreviewCardProps {
  document: DocumentListItem;
  onClick?: () => void;
}

function getCategoryClasses(category: string) {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory == "PDF") {
    return "bg-indigo-50 text-indigo-600";
  }

  if (normalizedCategory == "DOCX") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-slate-100 text-slate-600";
}

function DocumentPlaceholder({ document }: DocumentPreviewCardProps) {
  return (
    <div className="w-full aspect-[3/4] bg-white border border-black rounded shadow-sm p-4 flex flex-col gap-3 relative overflow-hidden group-hover:border-slate-300 transition-colors select-none">
      <div className="flex gap-2 items-center">
        <div className="w-6 h-6 rounded-full shrink-0 bg-indigo-600/85 flex items-center justify-center text-[8px] text-white font-bold">
          {document.candidateName.charAt(0).toUpperCase() || "D"}
        </div>
        <div className="flex flex-col gap-1 w-full">
          <div className="h-1.5 w-2/3 bg-slate-800 rounded" />
          <div className="h-1 w-1/2 bg-slate-400 rounded" />
        </div>
      </div>

      <div className="w-full h-px bg-slate-100" />

      <div className="grid grid-cols-3 gap-2 flex-1">
        <div className="col-span-1 flex flex-col gap-2">
          <div className="h-1.5 w-full rounded bg-indigo-600 opacity-20" />
          <div className="flex flex-col gap-1">
            <div className="h-1 w-full bg-slate-300 rounded" />
            <div className="h-1 w-4/5 bg-slate-300 rounded" />
            <div className="h-1 w-full bg-slate-300 rounded" />
          </div>
          <div className="h-1.5 w-full rounded bg-indigo-600 opacity-20 mt-1" />
          <div className="flex flex-col gap-1">
            <div className="h-1 w-11/12 bg-slate-300 rounded" />
            <div className="h-1 w-3/4 bg-slate-300 rounded" />
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-2">
          <div className="h-1.5 w-1/2 bg-slate-500 rounded" />
          <div className="flex flex-col gap-1">
            <div className="h-1 w-full bg-slate-300 rounded" />
            <div className="h-1 w-11/12 bg-slate-300 rounded" />
            <div className="h-1 w-5/6 bg-slate-200 rounded" />
          </div>
          <div className="h-1.5 w-1/3 bg-slate-500 rounded mt-1" />
          <div className="flex flex-col gap-1">
            <div className="h-1 w-full bg-slate-300 rounded" />
            <div className="h-1 w-full bg-slate-200 rounded" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 right-0 w-12 h-12 rounded-tl-full opacity-10 bg-indigo-600" />
    </div>
  );
}

export default function DocumentPreviewCard({ document, onClick }: DocumentPreviewCardProps) {
  return (
    <article
      onClick={onClick}
      className="group bg-white border border-slate-100 rounded-sm p-2 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 flex flex-col justify-between cursor-pointer"
    >
      <div className="mb-4 overflow-hidden rounded">
        {document.previewUrl ? (
          <div
            role="img"
            aria-label={`Aperçu de ${document.name}`}
            className="w-full aspect-[3/4] bg-white bg-cover bg-top border border-slate-200/60 rounded shadow-sm"
            style={{ backgroundImage: `url("${document.previewUrl}")` }}
          />
        ) : (
          <DocumentPlaceholder document={document} />
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-bold text-slate-800 truncate block">
            {document.candidateName}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${getCategoryClasses(document.category)}`}>
            {document.category}
          </span>
        </div>

        <p className="text-[10px] text-slate-500 font-medium truncate">
          {document.role}
        </p>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {document.importDate}
          </span>
          <span>{document.fileSize}</span>
        </div>

        <div className="flex items-center gap-1.5 pt-2 text-[10px] text-slate-400">
          <FileText size={12} />
          <span className="truncate">{document.name}</span>
        </div>
      </div>
    </article>
  );
}
