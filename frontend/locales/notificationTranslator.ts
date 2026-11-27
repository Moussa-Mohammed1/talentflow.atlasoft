import type { AppLanguage } from "@/locales/translations";

interface TranslatedNotification {
  title: string;
  message: string;
}

const titleMap: Record<string, { fr: string; en: string }> = {
  "CV téléchargé": { fr: "CV téléchargé", en: "Resume uploaded" },
  "Resume uploaded": { fr: "CV téléchargé", en: "Resume uploaded" },

  "Extraction d'identité terminée": {
    fr: "Extraction d'identité terminée",
    en: "Identity extraction completed",
  },
  "Identity extraction completed": {
    fr: "Extraction d'identité terminée",
    en: "Identity extraction completed",
  },

  "Identité mise à jour": { fr: "Identité mise à jour", en: "Identity updated" },
  "Identity updated": { fr: "Identité mise à jour", en: "Identity updated" },

  "Analyse du CV terminée": {
    fr: "Analyse du CV terminée",
    en: "Resume analysis completed",
  },
  "Resume analysis completed": {
    fr: "Analyse du CV terminée",
    en: "Resume analysis completed",
  },

  "Analyse du CV échouée": {
    fr: "Analyse du CV échouée",
    en: "Resume analysis failed",
  },
  "Resume analysis failed": {
    fr: "Analyse du CV échouée",
    en: "Resume analysis failed",
  },

  "Candidat en double détecté": {
    fr: "Candidat en double détecté",
    en: "Duplicate candidate detected",
  },
  "Duplicate candidate detected": {
    fr: "Candidat en double détecté",
    en: "Duplicate candidate detected",
  },

  "Correspondance de candidat terminée": {
    fr: "Correspondance de candidat terminée",
    en: "Candidate matching completed",
  },
  "Candidate matching completed": {
    fr: "Correspondance de candidat terminée",
    en: "Candidate matching completed",
  },

  "Extraction de langues terminée": {
    fr: "Extraction de langues terminée",
    en: "Language extraction completed",
  },
  "Language extraction completed": {
    fr: "Extraction de langues terminée",
    en: "Language extraction completed",
  },

  "Extraction de langues échouée": {
    fr: "Extraction de langues échouée",
    en: "Language extraction failed",
  },
  "Language extraction failed": {
    fr: "Extraction de langues échouée",
    en: "Language extraction failed",
  },
};

const reasonMap: Record<string, { fr: string; en: string }> = {
  "Le CV n'a pas pu être analysé.": {
    fr: "Le CV n'a pas pu être analysé.",
    en: "The resume could not be analyzed.",
  },
  "The resume could not be analyzed.": {
    fr: "Le CV n'a pas pu être analysé.",
    en: "The resume could not be analyzed.",
  },
  "L'analyse a échoué": {
    fr: "L'analyse a échoué",
    en: "Analysis failed",
  },
  "Analysis failed": {
    fr: "L'analyse a échoué",
    en: "Analysis failed",
  },
  "Une erreur de traitement inattendue s'est produite.": {
    fr: "Une erreur de traitement inattendue s'est produite.",
    en: "An unexpected processing error occurred.",
  },
  "An unexpected processing error occurred.": {
    fr: "Une erreur de traitement inattendue s'est produite.",
    en: "An unexpected processing error occurred.",
  },
};

function translateReason(reason: string, language: AppLanguage): string {
  const trimmed = reason.trim();
  const mapped = reasonMap[trimmed];
  return mapped ? mapped[language] : trimmed;
}

function translateSubject(subject: string, language: AppLanguage): string {
  const trimmed = subject.trim();
  if (trimmed === "Le candidat" || trimmed === "The candidate" || trimmed === "the candidate") {
    return language === "en" ? "the candidate" : "Le candidat";
  }
  return trimmed;
}

export function translateNotificationMessage(message: string, language: AppLanguage): string {
  const trimmed = message.trim();

  // 1. Resume uploaded
  let match = trimmed.match(/^"(.+)" a été téléchargé avec succès\.?$/);
  if (match) {
    return language === "en"
      ? `"${match[1]}" was uploaded successfully.`
      : `"${match[1]}" a été téléchargé avec succès.`;
  }
  match = trimmed.match(/^"(.+)" was uploaded successfully\.?$/);
  if (match) {
    return language === "en"
      ? `"${match[1]}" was uploaded successfully.`
      : `"${match[1]}" a été téléchargé avec succès.`;
  }

  // 2. Identity extraction completed
  match = trimmed.match(/^Extraction d'identité terminée avec succès pour (.+)\.$/);
  if (match) {
    const subj = translateSubject(match[1], language);
    return language === "en"
      ? `Identity extraction completed successfully for ${subj}.`
      : `Extraction d'identité terminée avec succès pour ${subj}.`;
  }
  match = trimmed.match(/^Identity extraction completed successfully for (.+)\.$/);
  if (match) {
    const subj = translateSubject(match[1], language);
    return language === "en"
      ? `Identity extraction completed successfully for ${subj}.`
      : `Extraction d'identité terminée avec succès pour ${subj}.`;
  }

  // 3. Identity updated
  match = trimmed.match(/^Détails d'identité mis à jour avec succès pour (.+)\.$/);
  if (match) {
    const subj = translateSubject(match[1], language);
    return language === "en"
      ? `Identity details updated successfully for ${subj}.`
      : `Détails d'identité mis à jour avec succès pour ${subj}.`;
  }
  match = trimmed.match(/^Identity details updated successfully for (.+)\.$/);
  if (match) {
    const subj = translateSubject(match[1], language);
    return language === "en"
      ? `Identity details updated successfully for ${subj}.`
      : `Détails d'identité mis à jour avec succès pour ${subj}.`;
  }

  // 4. Resume analysis completed
  match = trimmed.match(/^L['’]analyse du CV "(.+?)" est terminée\./);
  if (match) {
    return language === "en"
      ? `Analysis of resume "${match[1]}" is complete. You can now view this resume and evaluate its compatibility across departments.`
      : `L’analyse du CV "${match[1]}" est terminée. Vous pouvez désormais consulter ce CV et évaluer sa compatibilité avec les différents départements.`;
  }
  match = trimmed.match(/^Analysis of resume "(.+?)" is complete\./);
  if (match) {
    return language === "en"
      ? `Analysis of resume "${match[1]}" is complete. You can now view this resume and evaluate its compatibility across departments.`
      : `L’analyse du CV "${match[1]}" est terminée. Vous pouvez désormais consulter ce CV et évaluer sa compatibilité avec les différents départements.`;
  }

  // 5. Resume analysis failed
  match = trimmed.match(/^Analyse échouée pour "(.+?)"\s*:\s*(.+)$/);
  if (match) {
    const reason = translateReason(match[2], language);
    return language === "en"
      ? `Analysis failed for "${match[1]}": ${reason}`
      : `Analyse échouée pour "${match[1]}" : ${reason}`;
  }
  match = trimmed.match(/^Analysis failed for "(.+?)":\s*(.+)$/);
  if (match) {
    const reason = translateReason(match[2], language);
    return language === "en"
      ? `Analysis failed for "${match[1]}": ${reason}`
      : `Analyse échouée pour "${match[1]}" : ${reason}`;
  }

  // 6. Duplicate candidate detected
  match = trimmed.match(
    /^Candidat en double\s*:\s*cette identité appartient déjà au CV de "(.+?)"\s*;\s*le nouveau CV a été supprimé\.$/
  );
  if (match) {
    return language === "en"
      ? `Duplicate candidate: this identity already belongs to "${match[1]}"'s resume; the uploaded resume was removed.`
      : `Candidat en double : cette identité appartient déjà au CV de "${match[1]}" ; le nouveau CV a été supprimé.`;
  }
  match = trimmed.match(
    /^Duplicate candidate: this identity already belongs to "(.+?)"'s resume; the uploaded resume was removed\.$/
  );
  if (match) {
    return language === "en"
      ? `Duplicate candidate: this identity already belongs to "${match[1]}"'s resume; the uploaded resume was removed.`
      : `Candidat en double : cette identité appartient déjà au CV de "${match[1]}" ; le nouveau CV a été supprimé.`;
  }

  match = trimmed.match(
    /^Candidat en double\s*:\s*cette identité est déjà enregistrée pour ce CV de (.+?)\.$/
  );
  if (match) {
    return language === "en"
      ? `Duplicate candidate: this identity is already registered for ${match[1]}'s resume.`
      : `Candidat en double : cette identité est déjà enregistrée pour ce CV de ${match[1]}.`;
  }
  match = trimmed.match(
    /^Duplicate candidate: this identity is already registered for (.+?)'s resume\.$/
  );
  if (match) {
    return language === "en"
      ? `Duplicate candidate: this identity is already registered for ${match[1]}'s resume.`
      : `Candidat en double : cette identité est déjà enregistrée pour ce CV de ${match[1]}.`;
  }

  // 7. Candidate matching completed
  match = trimmed.match(/^(\d+)\s+opportunité\(s\)\s+trouvée\(s\)\s+pour\s+(.+)\.$/);
  if (match) {
    const count = Number(match[1]);
    return language === "en"
      ? `${count} ${count === 1 ? "match" : "matches"} found for ${match[2]}.`
      : `${count} opportunité(s) trouvée(s) pour ${match[2]}.`;
  }
  match = trimmed.match(/^(\d+)\s+match(?:es|\(es\))?\s+found\s+for\s+(.+)\.$/);
  if (match) {
    const count = Number(match[1]);
    return language === "en"
      ? `${count} ${count === 1 ? "match" : "matches"} found for ${match[2]}.`
      : `${count} opportunité(s) trouvée(s) pour ${match[2]}.`;
  }

  // 8. Language extraction completed
  match = trimmed.match(/^(\d+)\s+langue\(s\)\s+trouvée\(s\)\s+dans le CV\.$/);
  if (match) {
    const count = Number(match[1]);
    return language === "en"
      ? `${count} ${count === 1 ? "language" : "languages"} found in the resume.`
      : `${count} langue(s) trouvée(s) dans le CV.`;
  }
  match = trimmed.match(/^(\d+)\s+language(?:\(s\)|s)?\s+found in the resume\.$/);
  if (match) {
    const count = Number(match[1]);
    return language === "en"
      ? `${count} ${count === 1 ? "language" : "languages"} found in the resume.`
      : `${count} langue(s) trouvée(s) dans le CV.`;
  }

  // 9. Language extraction failed
  match = trimmed.match(/^Extraction de langues échouée\s*:\s*(.+)$/);
  if (match) {
    return language === "en"
      ? `Language extraction failed: ${match[1]}`
      : `Extraction de langues échouée : ${match[1]}`;
  }
  match = trimmed.match(/^Language extraction failed:\s*(.+)$/);
  if (match) {
    return language === "en"
      ? `Language extraction failed: ${match[1]}`
      : `Extraction de langues échouée : ${match[1]}`;
  }

  return message;
}

export function translateNotificationContent(
  title: string,
  message: string,
  language: AppLanguage
): TranslatedNotification {
  const mappedTitle = titleMap[title.trim()];
  return {
    title: mappedTitle ? mappedTitle[language] : title,
    message: translateNotificationMessage(message, language),
  };
}
