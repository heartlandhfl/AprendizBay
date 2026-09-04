import { modalityLabel } from "@/lib/tutors/format";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";

export interface ProfileSummaryField {
  label: string;
  value: string;
}

export function buildProfileSummaryFields(
  profile: StudentLearningProfile,
): ProfileSummaryField[] {
  const fields: ProfileSummaryField[] = [];

  if (profile.preferredSubject?.trim()) {
    fields.push({ label: "Matéria de interesse", value: profile.preferredSubject.trim() });
  }

  if (profile.preferredLevel?.trim()) {
    fields.push({ label: "Nível", value: profile.preferredLevel.trim() });
  }

  if (profile.preferredModality) {
    fields.push({ label: "Modalidade", value: modalityLabel(profile.preferredModality) });
  }

  const city = profile.preferredCity?.trim() || profile.city?.trim();
  if (city) {
    fields.push({ label: "Cidade", value: city });
  }

  if (profile.learningObjective?.trim()) {
    fields.push({ label: "Objetivo", value: profile.learningObjective.trim() });
  }

  return fields;
}

export function hasProfileSummaryData(profile: StudentLearningProfile): boolean {
  return buildProfileSummaryFields(profile).length > 0;
}
