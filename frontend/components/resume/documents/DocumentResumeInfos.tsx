import React, { useEffect, useState, useRef } from "react";
import { 
  Pencil, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Code, 
  Globe, 
  Sparkles, 
  RefreshCw,
  Check,
  CheckCircle,
  Loader2,
  AlertCircle,
  MoreVertical,
  Trash2,
  X,
  Save
} from "lucide-react";
import api from "@/lib/axios";
import { useToast } from "@/hooks/useToast";
import { reanalyzeIdentity, reanalyzeAll, updateCandidat, updateExperience, updateEducation, updateCertification, deleteResume } from "@/services/resume.service";
import { useAuthStore } from "@/stores/auth.store";
import DeleteConfirmModal from "./DeleteConfirmModal";

export interface ExtractedSkill {
  id: number;
  name: string;
  category_name: string; 
}

export interface ExtractedCertification {
  id: number;
  name?: string;
  organization: string;
  issue_date?: string;
  expiration_date?: string;
  credential_id?: string;
  credential_url?: string;
  description?: string;
}

export interface ExtractedEducation {
  id: number;
  institution: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface ExtractedExperience {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
}

export interface ExtractedLanguage {
  id: number;
  name: string;
}

export interface ResumeDetails {
  resume_id: number;
  recruiter_id: number;
  recruiter_name: string;
  candidat: {
    id: number;
    fullname: string;
    email: string;
    phone: string;
    photo: string | null;
    created_at: string;
  } | null;
  experiences: ExtractedExperience[] | null;
  educations: ExtractedEducation[] | null;
  certifications: ExtractedCertification[] | null;
  skills: ExtractedSkill[] | null;
  languages: ExtractedLanguage[] | null;
}

interface DocumentResumeInfosProps {
  isOpen: boolean;
  onClose: () => void;
  data?: ResumeDetails | null;
  onDeleted?: () => void;
}

function EditableField({ value, onSave, placeholder = "", inputClassName = "", readOnly = false }: { value: string; onSave: (val: string) => Promise<void>; placeholder?: string; inputClassName?: string; readOnly?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      setDraft(value);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={`px-1.5 py-0.5 border border-yellow-400 rounded text-xs font-bold text-slate-800 bg-white outline-none ring-1 ring-yellow-300 ${inputClassName}`}
          placeholder={placeholder}
        />
        {saving ? (
          <Loader2 size={12} className="animate-spin text-slate-400 shrink-0" />
        ) : (
          <>
            <button onClick={handleSave} className="p-0.5 text-green-600 hover:text-green-700 cursor-pointer shrink-0"><Check size={12} /></button>
            <button onClick={handleCancel} className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"><X size={12} /></button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group/edit">
      <span className="font-bold text-slate-800">{value || placeholder || "—"}</span>
      {!readOnly && (
        <button onClick={() => setEditing(true)} className="p-0.5 rounded text-slate-300 opacity-0 group-hover/edit:opacity-100 hover:text-yellow-600 transition-all cursor-pointer shrink-0">
          <Pencil size={10} />
        </button>
      )}
    </div>
  );
}

function EditableTextArea({ value, onSave, placeholder = "", readOnly = false }: { value: string; onSave: (val: string) => Promise<void>; placeholder?: string; readOnly?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      setDraft(value);
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div className="space-y-1">
        <textarea ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} className="w-full px-1.5 py-1 border border-yellow-400 rounded text-[11px] text-slate-700 bg-white outline-none ring-1 ring-yellow-300 resize-none" rows={2} placeholder={placeholder} />
        <div className="flex gap-1">
          {saving ? <Loader2 size={12} className="animate-spin text-slate-400" />
            : <><button onClick={handleSave} className="p-0.5 text-green-600 hover:text-green-700 cursor-pointer"><Check size={12} /></button><button onClick={handleCancel} className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"><X size={12} /></button></>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 group/edit">
      <p className="text-[11px] text-slate-500 leading-normal">{value || placeholder || "—"}</p>
      {!readOnly && (
        <button onClick={() => setEditing(true)} className="p-0.5 rounded text-slate-300 opacity-0 group-hover/edit:opacity-100 hover:text-yellow-600 transition-all cursor-pointer shrink-0 mt-0.5">
          <Pencil size={10} />
        </button>
      )}
    </div>
  );
}

export default function DocumentResumeInfos({ isOpen, onClose, data, onDeleted }: DocumentResumeInfosProps) {
  if (!isOpen) return null;
  if (!data) return null;
  
  data.resume_id ??= 0;
  data.recruiter_id ??= 0;
  data.recruiter_name ??= "";
  data.candidat ??= { id: 0, fullname: "", email: "", phone: "", photo: null, created_at: "" };
  data.experiences ??= [];
  data.educations ??= [];
  data.certifications ??= [];
  data.skills ??= [];
  data.languages ??= [];

  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.id === data.recruiter_id;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Présent";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const groupedSkills = data.skills.reduce((acc, skill) => {
    if (!acc[skill.category_name]) acc[skill.category_name] = [];
    acc[skill.category_name].push(skill);
    return acc;
  }, {} as Record<string, ExtractedSkill[]>);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reanalyzingAll, setReanalyzingAll] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const storage_url = process.env.NEXT_PUBLIC_STORAGE_URL
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(false);
    api.get<Blob>(`/resumes/${data.resume_id}/preview`, { responseType: "blob" })
      .then((res) => { if (!cancelled) { setPreviewUrl(URL.createObjectURL(res.data)); setPreviewLoading(false); } })
      .catch(() => { if (!cancelled) { setPreviewError(true); setPreviewLoading(false); } });
    return () => { cancelled = true; };
  }, [data.resume_id]);

  const handleReanalyzeIdentity = () => {
    reanalyzeIdentity(data.resume_id).catch(() => {});
    toast.success("Demande de réanalyse de l'identité envoyée.");
    setTimeout(onClose, 500);
  };

  const handleReanalyzeAll = async () => {
    if (!data.resume_id) return;
    setReanalyzingAll(true);
    try {
      toast.success("Réanalyse complète lancée. Les données seront mises à jour.");
      await reanalyzeAll(data.resume_id);
    } catch (err) {
      toast.error("Erreur lors du lancement de la réanalyse complète.");
    } finally {
      setReanalyzingAll(false);
    }
  };

  const handleEvaluate = async () => {
    if (!data.candidat?.id) return;
    setEvaluating(true);
    try {
      toast.success("Évaluation du candidat lancée avec succès.");
      await api.post("/evaluate", { candidate_id: data.candidat.id });
      toast.success("Évaluation du candidat terminée avec succès")
    } catch {
      toast.error("Erreur lors de l'évaluation du candidat.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    await deleteResume(data.resume_id);
    setDeleteModalOpen(false);
    onClose();
    toast.success("CV supprimé avec succès.");
    if (onDeleted) onDeleted();
  };

  const handleSaveCandidat = async (field: string, value: string) => {
    await updateCandidat(data.resume_id, { [field]: value });
    if (data.candidat) {
      (data.candidat as Record<string, string | number>)[field] = value;
    }
    toast.success("Informations mises à jour.");
  };

  const handleSaveExperience = async (id: number, field: string, value: string) => {
    await updateExperience(id, { [field]: value || null });
    const exp = data.experiences?.find(e => e.id === id);
    if (exp) (exp as unknown as Record<string, string | undefined>)[field] = value;
    toast.success("Expérience mise à jour.");
  };

  const handleSaveEducation = async (id: number, field: string, value: string) => {
    await updateEducation(id, { [field]: value || null });
    const edu = data.educations?.find(e => e.id === id);
    if (edu) (edu as unknown as Record<string, string | undefined>)[field] = value;
    toast.success("Formation mise à jour.");
  };

  const handleSaveCertification = async (id: number, field: string, value: string) => {
    await updateCertification(id, { [field]: value || null });
    const cert = data.certifications?.find(c => c.id === id);
    if (cert) (cert as unknown as Record<string, string | undefined>)[field] = value;
    toast.success("Certification mise à jour.");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 selection:bg-slate-200">
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        fileName={data.candidat?.fullname || "CV"}
      />
      <div className="bg-white shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 mm">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Données du CV Extraites</h3>
              <p className="text-[10px] text-slate-500">Importé par {data.recruiter_name} — Vérifiez et modifiez les informations lues par l'intelligence artificielle.</p>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded mt-2 leading-relaxed">
                Veuillez vous assurer d'avoir bien examiné les compétences et expériences de ce candidat avant de l'évaluer.
              </p>
            </div>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200  shadow-lg z-50 py-1">
                {isOwner && (
                  <button
                    onClick={() => { setMenuOpen(false); setDeleteModalOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Supprimer
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onClose(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="w-[13px] flex justify-center">
                    <span className="block w-3 h-0.5 bg-slate-400 rounded-full" />
                  </span>
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex min-h-full">
          
          <div className="flex-1 p-6 space-y-6 bg-white">
            
           <div className="bg-slate-50/60 p-4 border border-slate-100 mrc space-y-3 relative group">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-slate-500" />
                Informations Personnelles
              </h4>
            </div>

            <div className="flex gap-4">
              {data.candidat?.photo && (
                <div className="shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200">
                    <img
                      src={`${storage_url}${data.candidat.photo}`}
                      alt="Photo du candidat"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs flex-1">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium block">Nom complet</span>
                <EditableField value={data.candidat?.fullname ?? ""} onSave={(v) => handleSaveCandidat("fullname", v)} placeholder="—" readOnly={!isOwner} />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium block flex items-center gap-1"><Mail size={12}/> Email</span>
                <EditableField value={data.candidat?.email ?? ""} onSave={(v) => handleSaveCandidat("email", v)} placeholder="—" readOnly={!isOwner} />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium block flex items-center gap-1"><Phone size={12}/> Téléphone</span>
                <EditableField value={data.candidat?.phone ?? ""} onSave={(v) => handleSaveCandidat("phone", v)} placeholder="—" readOnly={!isOwner} />
              </div>
            </div>
          </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
      
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Briefcase size={14} className="text-slate-500" />
                Parcours Professionnel
              </h4>
              
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {data.experiences.map((exp) => (
                  <div key={exp.id} className="p-3 border border-slate-100 hover:border-slate-200  bg-white space-y-1.5">
                    <div>
                      <span className="text-slate-400 font-medium block text-[10px]">Titre</span>
                      <EditableField value={exp.title ?? ""} onSave={(v) => handleSaveExperience(exp.id, "title", v)} placeholder="—" inputClassName="w-full" readOnly={!isOwner} />
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <div className="flex-1">
                        <span className="text-slate-400 font-medium block">Début</span>
                        <EditableField value={exp.start_date || ""} onSave={(v) => handleSaveExperience(exp.id, "start_date", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-400 font-medium block">Fin</span>
                        <EditableField value={exp.end_date || ""} onSave={(v) => handleSaveExperience(exp.id, "end_date", v)} placeholder="Présent" readOnly={!isOwner} />
                      </div>
                    </div>
                    {exp.description !== undefined && (
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Description</span>
                        <EditableTextArea value={exp.description ?? ""} onSave={(v) => handleSaveExperience(exp.id, "description", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

      
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <GraduationCap size={14} className="text-slate-500" />
                Éducation & Formations
              </h4>
              
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {data.educations.map((edu) => (
                  <div key={edu.id} className="p-3 border border-slate-100 hover:border-slate-200  bg-white space-y-1.5">
                    <div>
                      <span className="text-slate-400 font-medium block text-[10px]">Établissement</span>
                      <EditableField value={edu.institution ?? ""} onSave={(v) => handleSaveEducation(edu.id, "institution", v)} placeholder="—" inputClassName="w-full" readOnly={!isOwner} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400 font-medium block">Diplôme</span>
                        <EditableField value={edu.degree ?? ""} onSave={(v) => handleSaveEducation(edu.id, "degree", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Domaine</span>
                        <EditableField value={edu.field_of_study ?? ""} onSave={(v) => handleSaveEducation(edu.id, "field_of_study", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <div className="flex-1">
                        <span className="text-slate-400 font-medium block">Début</span>
                        <EditableField value={edu.start_date || ""} onSave={(v) => handleSaveEducation(edu.id, "start_date", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-400 font-medium block">Fin</span>
                        <EditableField value={edu.end_date || ""} onSave={(v) => handleSaveEducation(edu.id, "end_date", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                    </div>
                    {edu.description !== undefined && (
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Description</span>
                        <EditableTextArea value={edu.description ?? ""} onSave={(v) => handleSaveEducation(edu.id, "description", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            
          
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Code size={14} className="text-slate-500" />
                Compétences Clés
              </h4>
              <div className="p-3 border border-slate-100 mrc bg-slate-50/40 space-y-3">
                {Object.keys(groupedSkills).length > 0 ? (
                  Object.entries(groupedSkills).map(([category, skills]) => (
                    <div key={category} className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{category || "Général"}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill) => (
                          <span key={skill.id} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 text-[10px] rounded-md font-medium shadow-2xs">
                            {skill.name ?? "—"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Aucune compétence détectée.</p>
                )}
              </div>
            </div>

           
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Globe size={14} className="text-slate-500" />
                Langues
              </h4>
              <div className="p-3 border border-slate-100 mrc bg-white space-y-2">
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.languages.map((lang) => (
                    <span key={lang.id} className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs  font-bold">
                      {lang.name ?? "—"}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

         
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Award size={14} className="text-slate-500" />
              Certifications Émises
            </h4>
            {data.certifications.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.certifications.map((cert) => (
                  <div key={cert.id} className="p-3 border border-slate-100 hover:border-slate-200 bg-white space-y-1.5">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium block">Nom</span>
                        <EditableField value={cert.name ?? ""} onSave={(v) => handleSaveCertification(cert.id, "name", v)} placeholder="—" inputClassName="w-full" readOnly={!isOwner} />
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium block">Organisation</span>
                        <EditableField value={cert.organization ?? ""} onSave={(v) => handleSaveCertification(cert.id, "organization", v)} placeholder="—" inputClassName="w-full" readOnly={!isOwner} />
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Délivré le</span>
                        <EditableField value={cert.issue_date || ""} onSave={(v) => handleSaveCertification(cert.id, "issue_date", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Expire le</span>
                        <EditableField value={cert.expiration_date || ""} onSave={(v) => handleSaveCertification(cert.id, "expiration_date", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                      {cert.credential_id !== undefined && (
                        <div>
                          <span className="text-slate-400 font-medium block">ID Crédential</span>
                          <EditableField value={cert.credential_id ?? ""} onSave={(v) => handleSaveCertification(cert.id, "credential_id", v)} placeholder="—" readOnly={!isOwner} />
                        </div>
                      )}
                      {cert.credential_url !== undefined && (
                        <div>
                          <span className="text-slate-400 font-medium block">URL Crédential</span>
                          <EditableField value={cert.credential_url ?? ""} onSave={(v) => handleSaveCertification(cert.id, "credential_url", v)} placeholder="—" readOnly={!isOwner} />
                        </div>
                      )}
                    </div>
                    {cert.description !== undefined && (
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Description</span>
                        <EditableTextArea value={cert.description ?? ""} onSave={(v) => handleSaveCertification(cert.id, "description", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">Aucune certification détectée.</p>
            )}
          </div>
          </div>

          
          <div className="w-80 shrink-0 border-l border-slate-100 bg-slate-50 p-4 flex flex-col">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 shrink-0">Aperçu du document</h4>
            <div className="flex-1 flex items-start justify-center">
              {previewLoading && (
                <div className="flex flex-col items-center gap-2 pt-12 text-slate-400">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-[11px]">Chargement...</span>
                </div>
              )}
              {previewError && (
                <div className="flex flex-col items-center gap-2 pt-12 text-slate-400">
                  <AlertCircle size={20} />
                  <span className="text-[11px] text-center">Aperçu non disponible</span>
                </div>
              )}
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Aperçu 1ère page du CV"
                  className="w-full rounded border border-slate-200 shadow-sm"
                />
              )}
            </div>
          </div>

          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-2">
          
          {isOwner && (
            <button
              onClick={handleReanalyzeIdentity}
              className="text-black bg-white border border-black px-4 py-2  text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>Réanalyser l'identité</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleReanalyzeAll}
              disabled={reanalyzingAll}
              className="text-black bg-white border border-black px-4 py-2  text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={13} className={reanalyzingAll ? "animate-spin" : ""} />
              <span>{reanalyzingAll ? "Réanalyse en cours..." : "Réanalyser tout"}</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleEvaluate}
              disabled={evaluating || !data.candidat?.id}
              className="bg-emerald-600 text-white px-4 py-2  text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={14} className={evaluating ? "animate-pulse" : ""} />
              <span>{evaluating ? "Évaluation en cours..." : "Évaluer"}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="bg-black text-white px-4 py-2  text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check size={14} />
            <span>Terminé</span>
          </button>

        </div>

      </div>
    </div>
  );
}
