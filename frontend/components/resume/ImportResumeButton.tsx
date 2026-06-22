"use client";
import { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useResumeImport } from "@/hooks/useResumeImport";
import ImportProgessModal from "./ImportProgressModal";
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

pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function ImportResumeButton() {
    const { setModalOpen } = useModal();

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
        <div className="selection:bg-slate-200">
            <button 
                onClick={openModal}
                className="flex cursor-pointer items-center gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg shadow-sm hover:shadow transition-all"
            >
                
                <span>Importer</span><Plus size={14} />
            </button>

            <div 
                className={`fixed [scrollbar-width:none] inset-0 bg-white/20 backdrop-blur-lg  flex items-center justify-center p-4 z-50 transition-all duration-300 ease-out ${
                    isOpen 
                        ? "opacity-100 pointer-events-auto visual-effects-blur" /* Modale ouverte */
                        : "opacity-0 pointer-events-none" /* Modale fermée */
                }`}
            >
                 <div 
                    className={`bg-white rounded-xl shadow-2xl w-full max-w-250 h-full flex flex-col overflow-hidden border border-slate-200 transition-all duration-300 ease-out transform ${
                        isOpen 
                            ? "scale-100 translate-y-0 opacity-100" 
                            : "scale-95 translate-y-4 opacity-0"
                    }`}
                >
                    
                     <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0 border border-yellow-100">
                                    <UploadCloud size={15} />
                                </div>
                                <div>
                                    {fileName ? (
                                        <>
                                            <h3 className="font-semibold text-slate-800 text-xs truncate max-w-[340px]">
                                                {fileName}
                                            </h3>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {fileSize}
                                            </p>
                                        </>
                                    ) : (
                                        <h3 className="font-bold text-slate-800 text-xs">
                                            Importer un nouveau CV
                                        </h3>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={closeModal}
                                className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                      <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30">
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
                                className={`border-2 rounded-xl text-center transition-all flex flex-col items-center justify-center p-8 min-h-[340px] cursor-pointer ${
                                    isDragging 
                                        ? "border-yellow-500 bg-yellow-50/40" 
                                        : "border-dashed border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                                }`}
                            >
                                <UploadCloud size={28} className="text-slate-400 mb-2.5" />
                                <p className="text-xs font-semibold text-slate-600">
                                    Glissez-déposez votre CV ici ou <span className="text-yellow-600 underline">parcourez vos fichiers</span>
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Formats acceptés : PDF, DOCX (Max. 10 Mo)
                                </p>
                            </div>
                        ) : (
                             <div className="w-full flex flex-col border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden animate-fade-in">
                                
                                 <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <FileText size={13} />
                                        <span className="text-[11px] font-medium">
                                            {file?.type === "application/pdf" ? `Aperçu du document (1 / ${numPages || "?"} pages)` : "Fiche document"}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={resetImport}
                                        className="text-[11px] font-semibold text-yellow-600 hover:text-yellow-700 flex items-center gap-1 bg-yellow-50 hover:bg-yellow-100/80 px-2.5 py-1 rounded-md transition-all cursor-pointer border border-yellow-200/40"
                                    >
                                        <UploadCloud size={12} />
                                        Changer de document
                                    </button>
                                </div>

                                 <div className="p-4 bg-slate-100/40 flex justify-center items-center min-h-[380px] overflow-y-auto">
                                    {file?.type === "application/pdf" ? (
                                        <div className="bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden p-2 max-w-full">
                                            <Document
                                                file={file}
                                                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                                loading={<div className="text-[11px] text-slate-400 p-4">Chargement de l&apos;aperçu...</div>}
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
                                        <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-sm text-center shadow-xs">
                                            <FileText size={28} className="mx-auto mb-2 text-yellow-600" />
                                            <p className="text-xs font-semibold text-slate-700">
                                                Aperçu dynamique non disponible pour DOCX
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                                                Le format textuel de votre document sera traité et extrait de manière sécurisée après l&apos;importation.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                     <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:justify-end gap-2 shrink-0">
                        <button
                            onClick={closeModal}
                            className="px-4 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer text-center border border-slate-200 bg-white"
                        >
                            Annuler
                        </button>

                        <div className="relative group w-full sm:w-auto">
                            <button
                                disabled={!fileName}
                                onClick={() => { if (file) void handleImport(file); }}
                                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-semibold rounded-lg text-white transition-all shadow-xs ${
                                    fileName 
                                        ? "bg-yellow-600 hover:bg-yellow-700 cursor-pointer" 
                                        : "bg-yellow-600/40 text-white/70 cursor-not-allowed"
                                }}`}
                            >
                                
                                <Sparkles size={12} />
                                <span>Importer & extraire tous</span>
                            </button>

                            {fileName && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-950 text-white text-[10px] leading-normal rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center">
                                    <div className="flex items-start gap-1.5 text-left font-normal">
                                        <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                                        <span>L&apos;extraction complète des données peut prendre un temps estimé à 5 minutes.</span>
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
