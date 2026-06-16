import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
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
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];

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

    return (
        <div className="selection:bg-slate-200">
            <button 
                onClick={openModal}
                className="flex cursor-pointer items-center gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg shadow-sm hover:shadow transition-all"
            >
                <Plus size={15} />
                <span>Importer</span>
            </button>

            {/* --- MODALE D'IMPORTATION --- */}
            {isOpen && (
                <div className="fixed [scrollbar-width:none] inset-0 bg-[#ebeaea] flex items-center justify-center p-4 z-50 transition-opacity">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden transition-all border border-slate-100">
                        
                        {/* En-tête */}
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                <div className="w-7 h-7 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                                    <UploadCloud size={16} />
                                </div>

                                <div>
                                    {fileName ? (
                                        <>
                                        <h3 className="font-semibold text-slate-900 text-sm truncate max-w-[280px]">
                                            {fileName}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {fileSize}
                                        </p>
                                        </>
                                    ) : (
                                        <h3 className="font-bold text-slate-900 text-sm">
                                        Importer un nouveau CV
                                        </h3>
                                    )}
                                </div>
                                </div>

                                <button
                                onClick={() => {
                                    closeModal();
                                    resetImport();
                                }}
                                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Corps de la modale */}
                        <div className="p-5">
                            
                            {/* BOÎTIER UNIQUE : IMPORTATION / PRÉVISUALISATION INTEGRÉE */}
                            <div
                                onDragOver={!fileName ? handleDragOver : undefined}
                                onDragLeave={!fileName ? handleDragLeave : undefined}
                                onDrop={!fileName ? handleDrop : undefined}
                                onClick={!fileName ? () => fileInputRef.current?.click() : undefined}
                                className={`border-2 rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[220px] ${
                                    !fileName 
                                        ? isDragging 
                                            ? "border-yellow-500 bg-yellow-50/30 cursor-pointer" 
                                            : "border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer"
                                        : "border-solid border-slate-200 bg-slate-50/60"
                                }`}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,application/pdf"
                                    className="hidden" 
                                />

                                {!fileName ? (
                                    /* ÉTAT A : ZONE DE SÉLECTION INITIALE */
                                    <div className="flex flex-col items-center gap-2">
                                        <UploadCloud size={32} className="text-slate-400 mb-1" />
                                        <p className="text-xs font-bold text-slate-700">
                                            Glissez-déposez votre CV ici ou <span className="text-yellow-600 underline">parcourez vos fichiers</span>
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            Formats acceptés : PDF, DOCX (Max. 10 Mo)
                                        </p>
                                    </div>
                                ) : (
                                    /* ÉTAT B : PRÉVISUALISATION INTERNE DU CONTENU DU DOCUMENT */
                                    <div className="w-full flex flex-col items-center gap-2 animate-fade-in">

                                        {/* Mini-structure de document simulant l'extraction des données textuelles */}
                                        <div className="w-full max-w-md">
                                        {file?.type === "application/pdf" ? (
                                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                                <div className="h-50 overflow-y-auto flex justify-center p-2 [scrollbar-width:none]">
                                                    <Document
                                                    file={file}
                                                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                                    >
                                                    <Page
                                                        pageNumber={1}
                                                        width={300}
                                                        renderTextLayer={false}
                                                        renderAnnotationLayer={false}
                                                    />
                                                    </Document>
                                                </div>

                                                <div className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
                                                    Aperçu de la page 1 sur {numPages}
                                                </div>
                                            </div>
                                                                                        ) : (
                                            <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                                            <FileText
                                                size={32}
                                                className="mx-auto mb-2 text-yellow-600"
                                            />

                                            <p className="text-xs font-semibold text-slate-700">
                                                Aperçu DOCX non disponible
                                            </p>

                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Le document sera traité après l'importation.
                                            </p>
                                            </div>
                                        )}
                                        </div>

                                        <button 
                                            onClick={resetImport}
                                            className="text-[11px] font-bold text-yellow-600 hover:text-yellow-700 hover:underline mt-1 cursor-pointer"
                                        >
                                            Changer de document
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:justify-end gap-2">
                            <button
                                onClick={() => { closeModal(); resetImport(); }}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-center"
                            >
                                Annuler
                            </button>

                            <button
                                disabled={!fileName}
                                onClick={() => { alert("Extraction d'identité réussie !"); setIsOpen(false); resetImport(); }}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
                                    fileName 
                                        ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50" 
                                        : "bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed"
                                }`}
                            >
                                Importer & extraire identité
                            </button>

                            <div className="relative group">
                                <button
                                    disabled={!fileName}
                                    onClick={() => { alert("Extraction complète mise en arrière-plan."); setIsOpen(false); resetImport(); }}
                                    className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all shadow-xs ${
                                        fileName 
                                            ? "bg-yellow-600 hover:bg-yellow-700 cursor-pointer" 
                                            : "bg-yellow-500/40 text-white/80 cursor-not-allowed"
                                    }`}
                                >
                                    <Sparkles size={13} />
                                    <span>Importer & extraire tous</span>
                                </button>

                                {fileName && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-950 text-white text-[10px] leading-normal rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center">
                                        <div className="flex items-start gap-1.5 text-left font-normal">
                                            <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                                            <span>extraire tous les donnes peut prendre un temps estimée de 5 minutes.</span>
                                        </div>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}