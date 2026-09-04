import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";

/**
 * Onboarding steps that already gate professor profile creation.
 * Reused as a percentage so the dashboard can show progress without a new model.
 */
export const TUTOR_PROFILE_COMPLETION_STEPS = [
  "subject",
  "location",
  "bio",
  "avatar",
  "prices",
  "modality",
  "credential",
] as const;

export type TutorProfileCompletionStep = (typeof TUTOR_PROFILE_COMPLETION_STEPS)[number];

export interface TutorProfileCompletion {
  percentage: number;
  filled: number;
  total: number;
  missing: TutorProfileCompletionStep[];
  hasProfile: boolean;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function stepFilled(
  tutorDoc: FirestoreTutorDoc | null | undefined,
  step: TutorProfileCompletionStep,
): boolean {
  if (!tutorDoc) {
    return false;
  }

  switch (step) {
    case "subject":
      return hasText(tutorDoc.subject);
    case "location":
      return hasText(tutorDoc.city) && hasText(tutorDoc.state);
    case "bio":
      return hasText(tutorDoc.bio) && tutorDoc.bio.trim().length >= 20;
    case "avatar":
      return hasText(tutorDoc.avatarUrl);
    case "prices":
      return (
        typeof tutorDoc.individualPrice === "number" &&
        tutorDoc.individualPrice > 0 &&
        typeof tutorDoc.collectivePrice === "number" &&
        tutorDoc.collectivePrice > 0
      );
    case "modality":
      return hasText(tutorDoc.modality);
    case "credential":
      return hasText(tutorDoc.credentialFileName);
    default:
      return false;
  }
}

export function computeTutorProfileCompletion(
  tutorDoc: FirestoreTutorDoc | null | undefined,
): TutorProfileCompletion {
  const missing = TUTOR_PROFILE_COMPLETION_STEPS.filter(
    (step) => !stepFilled(tutorDoc, step),
  );
  const total = TUTOR_PROFILE_COMPLETION_STEPS.length;
  const filled = total - missing.length;

  return {
    percentage: Math.round((filled / total) * 100),
    filled,
    total,
    missing,
    hasProfile: !!tutorDoc,
  };
}

export function firstNameFromDisplay(
  name: string | null | undefined,
  fallback = "Professor",
): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }
  return trimmed.split(/\s+/)[0] ?? fallback;
}

export function profileCompletionHref(completion: TutorProfileCompletion): string {
  if (completion.percentage < 100) {
    return "/tutor/onboarding";
  }

  return "/tutor/settings";
}

export const TUTOR_PROFILE_STEP_LABELS: Record<TutorProfileCompletionStep, string> = {
  subject: "Matéria",
  location: "Localização",
  bio: "Biografia",
  avatar: "Foto de perfil",
  prices: "Preços",
  modality: "Modalidade",
  credential: "Documento de verificação",
};

export function missingProfileStepLabels(
  missing: TutorProfileCompletionStep[],
): string[] {
  return missing.map((step) => TUTOR_PROFILE_STEP_LABELS[step]);
}
