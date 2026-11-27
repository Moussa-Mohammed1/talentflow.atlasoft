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
import { reanalyzeIdentity, reanalyzeAll, reanalyzeCompetences, reanalyzeExperiences, reanalyzeEducations, reanalyzeLanguages, updateCandidat, updateExperience, updateEducation, updateCertification, deleteResume } from "@/services/resume.service";
import { useAuthStore } from "@/stores/auth.store";
import { useLanguage } from "@/context/LanguageContext";
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
  onRefresh?: () => void;
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
          className={`px-1.5 py-0.5 border border-yellow-400 rounded text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-[#1b1a19] outline-none ring-1 ring-yellow-300 ${inputClassName}`}
          placeholder={placeholder}
        />
        {saving ? (
          <Loader2 size={12} className="animate-spin text-slate-400 shrink-0" />
        ) : (
          <>
            <button onClick={handleSave} className="p-0.5 text-green-600 hover:text-green-700 cursor-pointer shrink-0"><Check size={12} /></button>
            <button onClick={handleCancel} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer shrink-0"><X size={12} /></button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group/edit">
      <span className="font-bold text-slate-800 dark:text-[#f3f2f1]">{value || placeholder || "—"}</span>
      {!readOnly && (
        <button onClick={() => setEditing(true)} className="p-0.5 rounded text-slate-300 dark:text-[#605e5c] opacity-0 group-hover/edit:opacity-100 hover:text-yellow-600 dark:hover:text-amber-400 transition-all cursor-pointer shrink-0">
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
        <textarea ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} className="w-full px-1.5 py-1 border border-yellow-400 rounded text-[11px] text-slate-700 dark:text-white bg-white dark:bg-[#1b1a19] outline-none ring-1 ring-yellow-300 resize-none" rows={2} placeholder={placeholder} />
        <div className="flex gap-1">
          {saving ? <Loader2 size={12} className="animate-spin text-slate-400" />
            : <><button onClick={handleSave} className="p-0.5 text-green-600 hover:text-green-700 cursor-pointer"><Check size={12} /></button><button onClick={handleCancel} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"><X size={12} /></button></>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 group/edit">
      <p className="text-[11px] text-slate-500 dark:text-[#a19f9d] leading-normal">{value || placeholder || "—"}</p>
      {!readOnly && (
        <button onClick={() => setEditing(true)} className="p-0.5 rounded text-slate-300 dark:text-[#605e5c] opacity-0 group-hover/edit:opacity-100 hover:text-yellow-600 dark:hover:text-amber-400 transition-all cursor-pointer shrink-0 mt-0.5">
          <Pencil size={10} />
        </button>
      )}
    </div>
  );
}

export default function DocumentResumeInfos({ isOpen, onClose, data, onDeleted, onRefresh }: DocumentResumeInfosProps) {
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
  const { locale, l } = useLanguage();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return l("Présent", "Present");
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(locale, { month: "2-digit", year: "numeric" });
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
  const [reanalyzingCompetences, setReanalyzingCompetences] = useState(false);
  const [reanalyzingExperiences, setReanalyzingExperiences] = useState(false);
  const [reanalyzingEducations, setReanalyzingEducations] = useState(false);
  const [reanalyzingLanguages, setReanalyzingLanguages] = useState(false);
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
    toast.success(l("Demande de réanalyse de l'identité envoyée.", "Identity re-analysis request sent."));
    setTimeout(onClose, 500);
  };

  const handleReanalyzeAll = async () => {
    if (!data.resume_id) return;
    setReanalyzingAll(true);
    try {
      toast.success(l("Réanalyse complète lancée. Les données seront mises à jour.", "Full re-analysis started. Data will be updated."));
      await reanalyzeAll(data.resume_id);
    } catch {
      toast.error(l("Erreur lors du lancement de la réanalyse complète.", "Error starting full re-analysis."));
    } finally {
      setReanalyzingAll(false);
    }
  };

  const handleReanalyzeCompetences = async () => {
    if (!data.resume_id) return;
    setReanalyzingCompetences(true);
    try {
      toast.success(l("Réanalyse des compétences lancée.", "Skill re-analysis started."));
      await reanalyzeCompetences(data.resume_id);
      toast.success(l("Compétences réanalysées avec succès.", "Skills re-analyzed successfully."));
    } catch {
      toast.error(l("Erreur lors de la réanalyse des compétences.", "Error re-analyzing skills."));
    } finally {
      setReanalyzingCompetences(false);
    }
  };

  const handleReanalyzeExperiences = async () => {
    if (!data.resume_id) return;
    setReanalyzingExperiences(true);
    try {
      toast.success(l("Réanalyse des expériences lancée.", "Experience re-analysis started."));
      await reanalyzeExperiences(data.resume_id);
      toast.success(l("Expériences réanalysées avec succès.", "Experiences re-analyzed successfully."));
    } catch {
      toast.error(l("Erreur lors de la réanalyse des expériences.", "Error re-analyzing experiences."));
    } finally {
      setReanalyzingExperiences(false);
    }
  };

  const handleReanalyzeEducations = async () => {
    if (!data.resume_id) return;
    setReanalyzingEducations(true);
    try {
      toast.success(l("Réanalyse des formations lancée.", "Education re-analysis started."));
      await reanalyzeEducations(data.resume_id);
      toast.success(l("Formations réanalysées avec succès.", "Education re-analyzed successfully."));
    } catch {
      toast.error(l("Erreur lors de la réanalyse des formations.", "Error re-analyzing education."));
    } finally {
      setReanalyzingEducations(false);
    }
  };

  const handleReanalyzeLanguages = async () => {
    if (!data.resume_id) return;
    setReanalyzingLanguages(true);
    try {
      toast.success(l("Réanalyse des langues lancée.", "Language re-analysis started."));
      await reanalyzeLanguages(data.resume_id);
      toast.success(l("Langues réanalysées avec succès.", "Languages re-analyzed successfully."));
    } catch {
      toast.error(l("Erreur lors de la réanalyse des langues.", "Error re-analyzing languages."));
    } finally {
      setReanalyzingLanguages(false);
    }
  };

  const handleEvaluate = async () => {
    if (!data.candidat?.id) return;
    setEvaluating(true);
    try {
      toast.success(l("Évaluation du candidat lancée avec succès.", "Candidate evaluation started successfully."));
      await api.post("/evaluate", { candidate_id: data.candidat.id });
      toast.success(l("Évaluation du candidat terminée avec succès", "Candidate evaluation completed successfully"));
    } catch {
      toast.error(l("Erreur lors de l'évaluation du candidat.", "Error evaluating candidate."));
    } finally {
      setEvaluating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    await deleteResume(data.resume_id);
    setDeleteModalOpen(false);
    onClose();
    toast.success(l("CV supprimé avec succès.", "Resume deleted successfully."));
    if (onDeleted) onDeleted();
  };

  const handleSaveCandidat = async (field: string, value: string) => {
    await updateCandidat(data.resume_id, { [field]: value });
    if (data.candidat) {
      (data.candidat as Record<string, string | number>)[field] = value;
    }
    toast.success(l("Informations mises à jour.", "Information updated."));
  };

  const handleSaveExperience = async (id: number, field: string, value: string) => {
    await updateExperience(id, { [field]: value || null });
    const exp = data.experiences?.find(e => e.id === id);
    if (exp) (exp as unknown as Record<string, string | undefined>)[field] = value;
    toast.success(l("Expérience mise à jour.", "Experience updated."));
  };

  const handleSaveEducation = async (id: number, field: string, value: string) => {
    await updateEducation(id, { [field]: value || null });
    const edu = data.educations?.find(e => e.id === id);
    if (edu) (edu as unknown as Record<string, string | undefined>)[field] = value;
    toast.success(l("Formation mise à jour.", "Education updated."));
  };

  const handleSaveCertification = async (id: number, field: string, value: string) => {
    await updateCertification(id, { [field]: value || null });
    const cert = data.certifications?.find(c => c.id === id);
    if (cert) (cert as unknown as Record<string, string | undefined>)[field] = value;
    toast.success(l("Certification mise à jour.", "Certification updated."));
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 selection:bg-slate-200 dark:selection:bg-[#0078d4]/30">
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        fileName={data.candidat?.fullname || "CV"}
      />
      <div className="bg-white dark:bg-[#252423] shadow-xl w-full max-w-8xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-[#3b3a39] mm">
        
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#3b3a39] flex justify-between items-center bg-slate-50 dark:bg-[#1b1a19]">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {l("Données du CV Extraites", "Extracted Resume Data")}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-[#a19f9d]">
                {l(
                  `Importé par ${data.recruiter_name} — Vérifiez et modifiez les informations lues par l'intelligence artificielle.`,
                  `Imported by ${data.recruiter_name} — Review and edit the information extracted by AI.`
                )}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-3 py-2 rounded mt-2 leading-relaxed">
                {l(
                  "Veuillez vous assurer d'avoir bien examiné les compétences et expériences de ce candidat avant de l'évaluer.",
                  "Please make sure you have carefully reviewed this candidate's skills and experiences before evaluating."
                )}
              </p>
            </div>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-[#323130] text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#252423] border border-slate-200 dark:border-[#3b3a39] shadow-lg z-50 py-1">
                {isOwner && (
                  <button
                    onClick={() => { setMenuOpen(false); setDeleteModalOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    {l("Supprimer", "Delete")}
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onClose(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-[#f3f2f1] hover:bg-slate-50 dark:hover:bg-[#323130] transition-colors cursor-pointer"
                >
                  <span className="w-[13px] flex justify-center">
                    <span className="block w-3 h-0.5 bg-slate-400 rounded-full" />
                  </span>
                  {l("Fermer", "Close")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex min-h-full">
          
          <div className="flex-1 p-6 space-y-6 bg-white dark:bg-[#252423]">
            
           <div className="bg-slate-50/60 dark:bg-[#1b1a19] p-4 border border-slate-100 dark:border-[#3b3a39] mrc space-y-3 relative group">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-[#3b3a39] pb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-slate-500 dark:text-[#a19f9d]" />
                {l("Informations Personnelles", "Personal Information")}
              </h4>
            </div>

            <div className="flex gap-4">
              {data.candidat?.photo && (
                <div className="shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 dark:border-[#3b3a39]">
                    <img
                      src={`${storage_url}${data.candidat.photo}`}
                      alt={l("Photo du candidat", "Candidate photo")}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs flex-1">
              <div className="space-y-1">
                <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Nom complet", "Full name")}</span>
                <EditableField value={data.candidat?.fullname ?? ""} onSave={(v) => handleSaveCandidat("fullname", v)} placeholder="—" readOnly={!isOwner} />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 dark:text-[#a19f9d] font-medium block flex items-center gap-1"><Mail size={12}/> Email</span>
                <EditableField value={data.candidat?.email ?? ""} onSave={(v) => handleSaveCandidat("email", v)} placeholder="—" readOnly={!isOwner} />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 dark:text-[#a19f9d] font-medium block flex items-center gap-1"><Phone size={12}/> {l("Téléphone", "Phone")}</span>
                <EditableField value={data.candidat?.phone ?? ""} onSave={(v) => handleSaveCandidat("phone", v)} placeholder="—" readOnly={!isOwner} />
              </div>
            </div>
          </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
      
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-[#3b3a39]">
                <Briefcase size={14} className="text-slate-500 dark:text-[#a19f9d]" />
                {l("Parcours Professionnel", "Work Experience")}
              </h4>
              
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {data.experiences.map((exp) => (
                  <div key={exp.id} className="p-3 border border-slate-100 dark:border-[#3b3a39] hover:border-slate-200 dark:hover:border-[#605e5c] bg-white dark:bg-[#1b1a19] space-y-1.5">
                    <div>
                      <span className="text-slate-400 dark:text-[#a19f9d] font-medium block text-[10px]">{l("Titre", "Title")}</span>
                      <EditableField value={exp.title ?? ""} onSave={(v) => handleSaveExperience(exp.id, "title", v)} placeholder="—" inputClassName="w-full" readOnly={!isOwner} />
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <div className="flex-1">
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Début", "Start")}</span>
                        <EditableField value={exp.start_date || ""} onSave={(v) => handleSaveExperience(exp.id, "start_date", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Fin", "End")}</span>
                        <EditableField value={exp.end_date || ""} onSave={(v) => handleSaveExperience(exp.id, "end_date", v)} placeholder={l("Présent", "Present")} readOnly={!isOwner} />
                      </div>
                    </div>
                    {exp.description !== undefined && (
                      <div>
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block text-[10px]">Description</span>
                        <EditableTextArea value={exp.description ?? ""} onSave={(v) => handleSaveExperience(exp.id, "description", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

      
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-[#3b3a39]">
                <GraduationCap size={14} className="text-slate-500 dark:text-[#a19f9d]" />
                {l("Éducation & Formations", "Education & Training")}
              </h4>
              
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {data.educations.map((edu) => (
                  <div key={edu.id} className="p-3 border border-slate-100 dark:border-[#3b3a39] hover:border-slate-200 dark:hover:border-[#605e5c] bg-white dark:bg-[#1b1a19] space-y-1.5">
                    <div>
                      <span className="text-slate-400 dark:text-[#a19f9d] font-medium block text-[10px]">{l("Établissement", "Institution")}</span>
                      <EditableField value={edu.institution ?? ""} onSave={(v) => handleSaveEducation(edu.id, "institution", v)} placeholder="—" inputClassName="w-full" readOnly={!isOwner} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Diplôme", "Degree")}</span>
                        <EditableField value={edu.degree ?? ""} onSave={(v) => handleSaveEducation(edu.id, "degree", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Domaine", "Field")}</span>
                        <EditableField value={edu.field_of_study ?? ""} onSave={(v) => handleSaveEducation(edu.id, "field_of_study", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <div className="flex-1">
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Début", "Start")}</span>
                        <EditableField value={edu.start_date || ""} onSave={(v) => handleSaveEducation(edu.id, "start_date", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Fin", "End")}</span>
                        <EditableField value={edu.end_date || ""} onSave={(v) => handleSaveEducation(edu.id, "end_date", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                    </div>
                    {edu.description !== undefined && (
                      <div>
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block text-[10px]">Description</span>
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
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-[#3b3a39]">
                <Code size={14} className="text-slate-500 dark:text-[#a19f9d]" />
                {l("Compétences Clés", "Key Skills")}
              </h4>
              <div className="p-3 border border-slate-100 dark:border-[#3b3a39] mrc bg-slate-50/40 dark:bg-[#1b1a19] space-y-3">
                {Object.keys(groupedSkills).length > 0 ? (
                  Object.entries(groupedSkills).map(([category, skills]) => (
                    <div key={category} className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#a19f9d]">
                        {category || l("Général", "General")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill) => (
                          <span key={skill.id} className="px-2 py-0.5 bg-white dark:bg-[#252423] border border-slate-200 dark:border-[#3b3a39] text-slate-700 dark:text-[#f3f2f1] text-[10px] rounded-md font-medium shadow-2xs">
                            {skill.name ?? "—"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 dark:text-[#a19f9d] italic">
                    {l("Aucune compétence détectée.", "No skills detected.")}
                  </p>
                )}
              </div>
            </div>

           
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-[#3b3a39]">
                <Globe size={14} className="text-slate-500 dark:text-[#a19f9d]" />
                {l("Langues", "Languages")}
              </h4>
              <div className="p-3 border border-slate-100 dark:border-[#3b3a39] mrc bg-white dark:bg-[#1b1a19] space-y-2">
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.languages.map((lang) => (
                    <span key={lang.id} className="px-2.5 py-1 bg-slate-100 dark:bg-[#323130] text-slate-800 dark:text-[#f3f2f1] text-xs font-bold">
                      {lang.name ?? "—"}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

         
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-[#3b3a39]">
              <Award size={14} className="text-slate-500 dark:text-[#a19f9d]" />
              {l("Certifications Émises", "Certifications")}
            </h4>
            {data.certifications.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.certifications.map((cert) => (
                  <div key={cert.id} className="p-3 border border-slate-100 dark:border-[#3b3a39] hover:border-slate-200 dark:hover:border-[#605e5c] bg-white dark:bg-[#1b1a19] space-y-1.5">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="col-span-2">
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Nom", "Name")}</span>
                        <EditableField value={cert.name ?? ""} onSave={(v) => handleSaveCertification(cert.id, "name", v)} placeholder="—" inputClassName="w-full" readOnly={!isOwner} />
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Organisation", "Organization")}</span>
                        <EditableField value={cert.organization ?? ""} onSave={(v) => handleSaveCertification(cert.id, "organization", v)} placeholder="—" inputClassName="w-full" readOnly={!isOwner} />
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Délivré le", "Issued on")}</span>
                        <EditableField value={cert.issue_date || ""} onSave={(v) => handleSaveCertification(cert.id, "issue_date", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("Expire le", "Expires on")}</span>
                        <EditableField value={cert.expiration_date || ""} onSave={(v) => handleSaveCertification(cert.id, "expiration_date", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                      {cert.credential_id !== undefined && (
                        <div>
                          <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("ID Crédential", "Credential ID")}</span>
                          <EditableField value={cert.credential_id ?? ""} onSave={(v) => handleSaveCertification(cert.id, "credential_id", v)} placeholder="—" readOnly={!isOwner} />
                        </div>
                      )}
                      {cert.credential_url !== undefined && (
                        <div>
                          <span className="text-slate-400 dark:text-[#a19f9d] font-medium block">{l("URL Crédential", "Credential URL")}</span>
                          <EditableField value={cert.credential_url ?? ""} onSave={(v) => handleSaveCertification(cert.id, "credential_url", v)} placeholder="—" readOnly={!isOwner} />
                        </div>
                      )}
                    </div>
                    {cert.description !== undefined && (
                      <div>
                        <span className="text-slate-400 dark:text-[#a19f9d] font-medium block text-[10px]">Description</span>
                        <EditableTextArea value={cert.description ?? ""} onSave={(v) => handleSaveCertification(cert.id, "description", v)} placeholder="—" readOnly={!isOwner} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 dark:text-[#a19f9d] italic">
                {l("Aucune certification détectée.", "No certifications detected.")}
              </p>
            )}
          </div>
          </div>

          
          <div className="w-80 shrink-0 border-l border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] p-4 flex flex-col">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#a19f9d] mb-3 shrink-0">
              {l("Aperçu du document", "Document preview")}
            </h4>
            <div className="flex-1 flex items-start justify-center">
              {previewLoading && (
                <div className="flex flex-col items-center gap-2 pt-12 text-slate-400 dark:text-[#a19f9d]">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-[11px]">{l("Chargement...", "Loading...")}</span>
                </div>
              )}
              {previewError && (
                <div className="flex flex-col items-center gap-2 pt-12 text-slate-400 dark:text-[#a19f9d]">
                  <AlertCircle size={20} />
                  <span className="text-[11px] text-center">{l("Aperçu non disponible", "Preview unavailable")}</span>
                </div>
              )}
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={l("Aperçu 1ère page du CV", "Resume page 1 preview")}
                  className="w-full rounded border border-slate-200 dark:border-[#3b3a39] shadow-sm"
                />
              )}
            </div>
          </div>

          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#3b3a39] bg-slate-50 dark:bg-[#1b1a19] flex flex-col sm:flex-row justify-end gap-1 w-full">
          
          {isOwner && (
            <button
              onClick={handleReanalyzeIdentity}
              className="text-black dark:text-[#f3f2f1] bg-white dark:bg-[#323130] border border-black dark:border-[#605e5c] px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-[#3b3a39] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>{l("Réanalyser l'identité", "Re-analyze identity")}</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleReanalyzeCompetences}
              disabled={reanalyzingCompetences}
              className="text-black dark:text-[#f3f2f1] bg-white dark:bg-[#323130] border border-black dark:border-[#605e5c] px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-[#3b3a39] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} className={reanalyzingCompetences ? "animate-spin" : ""} />
              <span>
                {reanalyzingCompetences
                  ? l("Réanalyse en cours...", "Re-analyzing...")
                  : l("Réanalyser compétences", "Re-analyze skills")}
              </span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleReanalyzeExperiences}
              disabled={reanalyzingExperiences}
              className="text-black dark:text-[#f3f2f1] bg-white dark:bg-[#323130] border border-black dark:border-[#605e5c] px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-[#3b3a39] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} className={reanalyzingExperiences ? "animate-spin" : ""} />
              <span>
                {reanalyzingExperiences
                  ? l("Réanalyse en cours...", "Re-analyzing...")
                  : l("Réanalyser expériences", "Re-analyze experiences")}
              </span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleReanalyzeEducations}
              disabled={reanalyzingEducations}
              className="text-black dark:text-[#f3f2f1] bg-white dark:bg-[#323130] border border-black dark:border-[#605e5c] px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-[#3b3a39] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} className={reanalyzingEducations ? "animate-spin" : ""} />
              <span>
                {reanalyzingEducations
                  ? l("Réanalyse en cours...", "Re-analyzing...")
                  : l("Réanalyser formations", "Re-analyze education")}
              </span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleReanalyzeLanguages}
              disabled={reanalyzingLanguages}
              className="text-black dark:text-[#f3f2f1] bg-white dark:bg-[#323130] border border-black dark:border-[#605e5c] px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-[#3b3a39] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} className={reanalyzingLanguages ? "animate-spin" : ""} />
              <span>
                {reanalyzingLanguages
                  ? l("Réanalyse en cours...", "Re-analyzing...")
                  : l("Réanalyser langues", "Re-analyze languages")}
              </span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleReanalyzeAll}
              disabled={reanalyzingAll}
              className="text-black dark:text-[#f3f2f1] bg-white dark:bg-[#323130] border border-black dark:border-[#605e5c] px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-[#3b3a39] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={13} className={reanalyzingAll ? "animate-spin" : ""} />
              <span>
                {reanalyzingAll
                  ? l("Réanalyse en cours...", "Re-analyzing...")
                  : l("Réanalyser tout", "Re-analyze all")}
              </span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleEvaluate}
              disabled={evaluating || !data.candidat?.id}
              className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={14} />
              <span>{evaluating ? l("Évaluation...", "Evaluating...") : l("Évaluer", "Evaluate")}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="bg-black dark:bg-[#0078d4] text-white px-4 py-2 text-xs font-bold hover:bg-slate-800 dark:hover:bg-[#106ebe] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check size={14} />
            <span>{l("Terminé", "Done")}</span>
          </button>

        </div>

      </div>
    </div>
  );
}
