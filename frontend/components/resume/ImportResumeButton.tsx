"use client";
import { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useResumeImport } from "@/hooks/useResumeImport";
import ImportProgessModal from "./ImportProgress/ImportProgressModal";
import {
  Plus,
  X,
  UploadCloud,
  FileText,
  Sparkles,
  AlertCircle,
} from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useModal } from "@/context/ModalContext";
import { useLanguage } from "@/context/LanguageContext";

pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function ImportResumeButton() {
    const { setModalOpen } = useModal();
    const { t, l } = useLanguage();

    const openModal = () => {
        setModalOpen(true);
        setIsOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setIsOpen(false);
        resetImport();
    };
    const [isOpen, setIsOpen] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<string | null>(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files?.[0] ?? null;

            setFile(selectedFile);
            setFileName(selectedFile.name);
            setFileSize(
            (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB"
            );
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selectedFile = e.dataTransfer.files[0];

            setFile(selectedFile);
            setFileName(selectedFile.name);
            setFileSize(
            (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB"
            );
        }
    };

    const resetImport = () => {
        setFile(null);
        setFileName(null);
        setFileSize(null);
        setNumPages(0);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    const {
        status,
        identityResult,
        analysisResult,
        importResume,
        reset,
    } = useResumeImport();

    const handleImport = async (
        file: File,
    ) => {
        try {
            setIsOpen(false);
            setShowProgressModal(true);
            setModalOpen(true);
            resetImport();
            await importResume({
                file,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const closeProgressModal = () => {
        setShowProgressModal(false);
        reset();
    };
    
    return (
        <div className="selection:bg-slate-200 dark:selection:bg-[#0078d4]/30">
            <button 
                onClick={openModal}
                className="flex cursor-pointer hover:border-yellow-500 border border-slate-200 dark:border-[#3b3a39] items-center gap-1.5 bg-white dark:bg-[#252423] hover:bg-black dark:hover:bg-[#0078d4] hover:text-white text-black dark:text-white font-medium text-xs px-3.5 py-2 shadow-sm hover:shadow transition-all"
            >
                
                <span className="not-lg:hidden">{l("Importer un candidat", "Import candidate")}</span><Plus size={14} />
            </button>

            <div 
                className={`fixed [scrollbar-width:none] inset-0 bg-white/20 dark:bg-black/60 backdrop-blur-lg flex items-center justify-center p-4 z-50 transition-all duration-300 ease-out ${
                    isOpen 
                        ? "opacity-100 pointer-events-auto visual-effects-blur" /* Modale ouverte */
                        : "opacity-0 pointer-events-none" /* Modale fermée */
                }`}
            >
                 <div 
                    className={`bg-white dark:bg-[#252423] mrc shadow-2xl w-full max-w-250 h-full flex flex-col overflow-hidden border border-slate-200 dark:border-[#3b3a39] transition-all duration-300 ease-out transform ${
                        isOpen 
                            ? "scale-100 translate-y-0 opacity-100" 
                            : "scale-95 translate-y-4 opacity-0"
                    }`}
                >
                    
                     <div className="px-5 py-3.5 border-b border-slate-100 dark:border-[#3b3a39] bg-slate-50/80 dark:bg-[#1b1a19] shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-yellow-50 dark:bg-amber-950/50 text-yellow-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-yellow-100 dark:border-amber-800/60">
                                    <UploadCloud size={15} />
                                </div>
                                <div>
                                    {fileName ? (
                                        <>
                                            <h3 className="font-semibold text-slate-800 dark:text-white text-xs truncate max-w-[340px]">
                                                {fileName}
                                            </h3>
                                            <p className="text-[10px] text-slate-400 dark:text-[#a19f9d] font-medium">
                                                {fileSize}
                                            </p>
                                        </>
                                    ) : (
                                        <h3 className="font-bold text-slate-800 dark:text-white text-xs">
                                            {l("Importer un nouveau CV", "Import a new resume")}
                                        </h3>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={closeModal}
                                className="p-1.5 hover:bg-slate-200/70 dark:hover:bg-[#323130] text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                      <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30 dark:bg-[#1b1a19]">
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,application/pdf"
                            className="hidden" 
                        />

                        {!fileName ? (
                            /* ÉTAT A : ZONE DE SÉLECTION INITIALE */
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 mrc text-center transition-all flex flex-col items-center justify-center p-8 min-h-[340px] cursor-pointer ${
                                    isDragging 
                                        ? "border-yellow-500 bg-yellow-50/40 dark:bg-amber-950/30" 
                                        : "border-dashed border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423] hover:border-slate-300 dark:hover:border-[#605e5c] hover:bg-slate-50/50 dark:hover:bg-[#323130]"
                                }`}
                            >
                                <UploadCloud size={28} className="text-slate-400 dark:text-[#a19f9d] mb-2.5" />
                                <p className="text-xs font-semibold text-slate-600 dark:text-[#f3f2f1]">
                                    {l("Glissez-déposez votre CV ici ou ", "Drag and drop your resume here or ")}
                                    <span className="text-black dark:text-white font-semibold underline">
                                      {l("parcourez vos fichiers", "browse your files")}
                                    </span>
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-[#a19f9d] mt-1">
                                    {l("Formats acceptés : PDF, DOCX (Max. 10 Mo)", "Accepted formats: PDF, DOCX (Max. 10 MB)")}
                                </p>
                            </div>
                        ) : (
                             <div className="w-full flex flex-col border border-slate-200 dark:border-[#3b3a39] mrc bg-white dark:bg-[#252423] shadow-xs overflow-hidden animate-fade-in">
                                
                                 <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-[#3b3a39] bg-slate-50/50 dark:bg-[#1b1a19]">
                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#a19f9d]">
                                        <FileText size={13} />
                                        <span className="text-[11px] font-medium">
                                            {file?.type === "application/pdf"
                                              ? l(`Aperçu du document (1 / ${numPages || "?"} pages)`, `Document preview (1 / ${numPages || "?"} pages)`)
                                              : l("Fiche document", "Document card")}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={resetImport}
                                        className="text-[11px] font-semibold text-black dark:text-white flex items-center gap-1 hover:bg-black/10 dark:hover:bg-[#323130] px-2.5 py-1 rounded-md transition-all cursor-pointer border border-slate-200 dark:border-[#3b3a39]"
                                    >
                                        <UploadCloud size={12} />
                                        {l("Changer de document", "Change document")}
                                    </button>
                                </div>

                                 <div className="p-4 bg-slate-100/40 dark:bg-[#1b1a19] flex justify-center items-center min-h-[380px] overflow-y-auto">
                                    {file?.type === "application/pdf" ? (
                                        <div className="bg-white border border-slate-200 dark:border-[#3b3a39] shadow-md overflow-hidden p-2 max-w-full">
                                            <Document
                                                file={file}
                                                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                                loading={<div className="text-[11px] text-slate-400 p-4">{l("Chargement de l'aperçu...", "Loading preview...")}</div>}
                                            >
                                                <Page
                                                    pageNumber={1}
                                                    width={480}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                    className="max-w-full h-auto"
                                                />
                                            </Document>
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-[#252423] border border-slate-200 dark:border-[#3b3a39] p-6 max-w-sm text-center shadow-xs">
                                            <FileText size={28} className="mx-auto mb-2 text-yellow-600 dark:text-amber-400" />
                                            <p className="text-xs font-semibold text-slate-700 dark:text-white">
                                                {l("Aperçu dynamique non disponible pour DOCX", "Live preview is not available for DOCX")}
                                            </p>
                                            <p className="text-[10px] text-slate-400 dark:text-[#a19f9d] mt-1 leading-normal">
                                                {l(
                                                  "Le format textuel de votre document sera traité et extrait de manière sécurisée après l'importation.",
                                                  "Your document text will be securely processed and extracted after import."
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                     <div className="px-5 py-3.5 border-t border-slate-100 dark:border-[#3b3a39] bg-slate-50/80 dark:bg-[#1b1a19] flex flex-col sm:flex-row sm:justify-end gap-2 shrink-0">
                        <button
                            onClick={closeModal}
                            className="px-4 py-2 text-[11px] font-semibold text-slate-600 dark:text-[#f3f2f1] hover:bg-slate-200/60 dark:hover:bg-[#323130] transition-colors cursor-pointer text-center border border-slate-200 dark:border-[#3b3a39] bg-white dark:bg-[#252423]"
                        >
                            {t.common.cancel}
                        </button>

                        <div className="relative group w-full sm:w-auto">
                            <button
                                disabled={!fileName}
                                onClick={() => { if (file) void handleImport(file); }}
                                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-semibold border border-slate-200 dark:border-[#3b3a39] transition-all shadow-xs ${
                                    fileName 
                                        ? "bg-white dark:bg-[#0078d4] text-black dark:text-white hover:bg-black/10 dark:hover:bg-[#106ebe] cursor-pointer" 
                                        : "bg-white dark:bg-[#252423] text-black/20 dark:text-[#605e5c] cursor-not-allowed"
                                }`}
                            >
                                
                                <Sparkles size={12}/>
                                <span>{l("Importer & extraire tous", "Import & extract all")}</span>
                            </button>

                            {fileName && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-950 text-white text-[10px] leading-normal shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center">
                                    <div className="flex items-start gap-1.5 text-left font-normal">
                                        <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                                        <span>
                                          {l(
                                            "L'extraction complète des données peut prendre un temps estimé à 5 minutes.",
                                            "Full data extraction may take up to 5 minutes."
                                          )}
                                        </span>
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950"></div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
            
            {showProgressModal && (
                <ImportProgessModal
                    status={status}
                    identityData={identityResult}
                    analysisData={analysisResult}
                    onClose={closeProgressModal}
                />
            )}
        </div>
    )
}
