import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  Briefcase,
  CalendarDays,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  User,
  Video,
  X,
} from "lucide-react";
import type {
  RecruitmentDetail,
  Interview,
  RecruitmentEmail,
  EmailPreviewResponse,
} from "@/types/recruitment";
import {
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
} from "@/types/recruitment";
import { recruitmentService } from "@/services/recruitment.service";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/auth.store";

const storage_url = process.env.NEXT_PUBLIC_STORAGE_URL;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const statusFlow: { status: string; label: string }[] = [
  { status: "pending", label: "En attente" },
  { status: "interview_invitation_sent", label: "Invitation envoyée" },
  { status: "interview_confirmed", label: "Entretien confirmé" },
  { status: "interview_completed", label: "Entretien terminé" },
  { status: "offer_sent", label: "Offre envoyée" },
  { status: "offer_accepted", label: "Offre acceptée" },
  { status: "hired", label: "Embauché" },
];

export function RecruitmentDetailModal({
  recruitmentId,
  onClose,
  onUpdated,
}: {
  recruitmentId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<RecruitmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "interview" | "email" | "timeline">("info");
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  // Interview form state
  const [interviewTitle, setInterviewTitle] = useState("Entretien de recrutement");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewDuration, setInterviewDuration] = useState(60);
  const [interviewLocation, setInterviewLocation] = useState("");
  const [interviewInterviewer, setInterviewInterviewer] = useState(user?.fullname || "");
  const [savingInterview, setSavingInterview] = useState(false);

  // Email state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailGenerated, setEmailGenerated] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [companyName, setCompanyName] = useState("Notre Société");
  const [emailLanguage, setEmailLanguage] = useState("french");

  const fetchDetail = useCallback(async () => {
    try {
      const data = await recruitmentService.getById(recruitmentId);
      setDetail(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [recruitmentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSaveInterview = async () => {
    if (!interviewDate || !interviewTime) {
      toast.error("Veuillez sélectionner une date et une heure");
      return;
    }
    setSavingInterview(true);
    try {
      const scheduledAt = new Date(`${interviewDate}T${interviewTime}`).toISOString();
      await recruitmentService.createInterview(recruitmentId, {
        title: interviewTitle,
        interview_type: interviewLocation ? "onsite" : "online",
        scheduled_at: scheduledAt,
        duration_minutes: interviewDuration,
        location: interviewLocation || null,
        interviewer_name: interviewInterviewer || null,
      });
      toast.success("Entretien planifié avec succès");
      await fetchDetail();
    } catch {
      toast.error("Erreur lors de la planification");
    } finally {
      setSavingInterview(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!interviewDate || !interviewTime) {
      toast.error("Veuillez d'abord définir la date et l'heure de l'entretien");
      setActiveTab("interview");
      return;
    }
    if (!detail?.recruitment || !detail?.candidate) return;
    setGeneratingEmail(true);
    try {
      const result = await recruitmentService.previewEmail(recruitmentId, {
        interview_date: interviewDate,
        interview_time: interviewTime,
        duration_minutes: interviewDuration,
        location: interviewLocation || null,
        recruiter_name: interviewInterviewer || user?.fullname || "Recruteur",
        company_name: companyName,
        language: emailLanguage,
      });
      setEmailSubject(result.subject);
      setEmailBody(result.body);
      setEmailGenerated(true);
      toast.success("Email généré avec succès");
    } catch {
      toast.error("Erreur lors de la génération de l'email");
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) {
      toast.error("Veuillez d'abord générer l'email");
      return;
    }
    setSendingEmail(true);
    try {
      await recruitmentService.sendEmail(recruitmentId, {
        subject: emailSubject,
        body: emailBody,
      });
      toast.success("Email envoyé avec succès");
      setEmailGenerated(false);
      setEmailSubject("");
      setEmailBody("");
      await fetchDetail();
      onUpdated();
    } catch {
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
        <div className="w-full max-w-3xl overflow-hidden mrc border border-gray-200/80 bg-white shadow-xl p-12 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
        <div className="w-full max-w-3xl overflow-hidden mrc border border-gray-200/80 bg-white shadow-xl p-12 flex flex-col items-center justify-center text-slate-400">
          <AlertCircle size={32} className="mb-2" />
          <span className="text-sm">Impossible de charger les détails</span>
          <button onClick={onClose} className="mt-4 border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const { recruitment, candidate, job_offer, interviews, emails } = detail;

  const tabs = [
    { key: "info" as const, label: "Informations" },
    { key: "interview" as const, label: "Entretien" },
    { key: "email" as const, label: "Email" },
    { key: "timeline" as const, label: "Chronologie" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-xs">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden mrc border border-gray-200/80 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">Détails du recrutement</h3>
            <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-medium ${statusColors[recruitment.status]}`}>
              {statusLabels[recruitment.status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 transition-colors cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-100 px-6 py-2 flex gap-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:none]">
          {activeTab === "info" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                {candidate?.photo ? (
                  <img src={`${storage_url}${candidate.photo}`} alt={candidate.fullname} className="w-16 h-16 rounded-full object-cover object-top bg-slate-100" />
                ) : (
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                    <User size={28} />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-slate-900">{candidate?.fullname || "Unknown"}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    {candidate?.email && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail size={11} /> {candidate.email}
                      </p>
                    )}
                    {candidate?.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone size={11} /> {candidate.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-xs text-slate-500">Score</p>
                  <p className="text-xl font-bold text-indigo-700">
                    {recruitment.compatibility_score?.toFixed(0) || "-"}%
                  </p>
                </div>
              </div>

              {job_offer && (
                <div className="border border-slate-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Poste</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{job_offer.title}</p>
                  {job_offer.description && (
                    <p className="text-xs text-slate-500 mt-1">{job_offer.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {recruitingPriorityLabel(recruitment.priority)}
                    </span>
                  </div>
                </div>
              )}

              {recruitment.notes && (
                <div className="border border-slate-100 rounded-lg p-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</span>
                  <p className="text-sm text-slate-700 mt-1">{recruitment.notes}</p>
                </div>
              )}

              <div className="text-[11px] text-slate-400">
                Créé le {formatDate(recruitment.created_at)}
              </div>
            </div>
          )}

          {activeTab === "interview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Titre</label>
                  <input
                    type="text"
                    value={interviewTitle}
                    onChange={(e) => setInterviewTitle(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Durée (minutes)</label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    value={interviewDuration}
                    onChange={(e) => setInterviewDuration(parseInt(e.target.value) || 60)}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Heure</label>
                  <input
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lieu</label>
                  <input
                    type="text"
                    value={interviewLocation}
                    onChange={(e) => setInterviewLocation(e.target.value)}
                    placeholder="Ex: Bureau principal"
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Interviewer</label>
                  <input
                    type="text"
                    value={interviewInterviewer}
                    onChange={(e) => setInterviewInterviewer(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveInterview}
                disabled={savingInterview}
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium shadow-xs hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {savingInterview ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                Planifier l'entretien
              </button>

              {interviews.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Entretiens planifiés</h4>
                  {interviews.map((interview) => (
                    <div key={interview.id} className="border border-slate-100 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{interview.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDateTime(interview.scheduled_at)} - {interview.duration_minutes}min
                        </p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                        interview.status === "scheduled" ? "bg-blue-50 text-blue-600" :
                        interview.status === "completed" ? "bg-emerald-50 text-emerald-600" :
                        interview.status === "cancelled" ? "bg-red-50 text-red-600" :
                        "bg-amber-50 text-amber-600"
                      }`}>
                        {interview.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "email" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Langue de l'email</label>
                  <select
                    value={emailLanguage}
                    onChange={(e) => setEmailLanguage(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="french">Français</option>
                    <option value="english">English</option>
                    <option value="arabic">العربية</option>
                    <option value="spanish">Español</option>
                    <option value="german">Deutsch</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateEmail}
                  disabled={generatingEmail}
                  className="inline-flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {generatingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Générer l'email
                </button>
              </div>

              {emailGenerated && (
                <div className="space-y-4 border border-slate-100 rounded-lg p-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sujet</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Aperçu</label>
                    <div
                      className="w-full border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white min-h-[200px] prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: emailBody }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Corps de l'email (HTML)</label>
                    <textarea
                      rows={8}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={sendingEmail}
                      className="inline-flex items-center gap-2 bg-black text-white px-5 py-2 text-sm font-medium shadow-xs hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Envoyer l'email
                    </button>
                  </div>
                </div>
              )}

              {emails.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Historique des emails</h4>
                  {emails.map((email) => (
                    <div key={email.id} className="border border-slate-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{email.subject}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                          email.status === "sent" ? "bg-emerald-50 text-emerald-600" :
                          email.status === "failed" ? "bg-red-50 text-red-600" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {email.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        À: {email.recipient_email}
                        {email.sent_at && ` - ${formatDateTime(email.sent_at)}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chronologie du recrutement</h4>
              <div className="relative">
                {statusFlow.map((step, index) => {
                  const isActive = statusFlow.findIndex(s => s.status === recruitment.status) >= index;
                  const isCurrent = step.status === recruitment.status;
                  return (
                    <div key={step.status} className="flex items-start gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          isCurrent ? "bg-indigo-600 ring-2 ring-indigo-200" :
                          isActive ? "bg-indigo-400" : "bg-slate-200"
                        }`} />
                        {index < statusFlow.length - 1 && (
                          <div className={`w-0.5 h-6 ${
                            isActive ? "bg-indigo-300" : "bg-slate-200"
                          }`} />
                        )}
                      </div>
                      <div className="pt-0.5">
                        <p className={`text-sm font-medium ${
                          isActive ? "text-slate-900" : "text-slate-400"
                        }`}>{step.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {interviews.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Entretiens</h5>
                  {interviews.map((interview) => (
                    <div key={interview.id} className="flex items-start gap-3 pb-3">
                      <div className="w-3 h-3 rounded-full bg-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{interview.title}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(interview.scheduled_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {emails.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Emails</h5>
                  {emails.map((email) => (
                    <div key={email.id} className="flex items-start gap-3 pb-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{email.subject}</p>
                        <p className="text-xs text-slate-500">
                          {email.status === "sent" ? "Envoyé" : email.status}
                          {email.sent_at && ` - ${formatDateTime(email.sent_at)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function recruitingPriorityLabel(priority: string): string {
  return priorityLabels[priority as keyof typeof priorityLabels] || priority;
}
