import type { Tutor } from "@/lib/mock-tutors";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";

export interface RecommendationContext {
  profile?: StudentLearningProfile | null;
  subjectsFromBookings?: string[];
  excludeTutorIds?: string[];
  limit?: number;
}

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function scoreTutor(
  tutor: Tutor,
  profile: StudentLearningProfile | null | undefined,
  subjects: string[],
): number {
  let score = tutor.rating * 10;

  const preferredSubject = normalize(profile?.preferredSubject);
  const tutorSubject = normalize(tutor.subject);
  const subjectMatches =
    (preferredSubject && tutorSubject === preferredSubject) ||
    subjects.some((subject) => normalize(subject) === tutorSubject);

  if (subjectMatches) {
    score += 40;
  }

  const preferredModality = profile?.preferredModality;
  if (preferredModality) {
    if (tutor.modality === preferredModality || tutor.modality === "ambos") {
      score += 20;
    }
  }

  const preferredCity = normalize(profile?.preferredCity);
  const tutorCity = normalize(tutor.city);
  if (preferredCity && tutorCity === preferredCity) {
    score += 15;
  }

  const preferredLevel = normalize(profile?.preferredLevel);
  if (
    preferredLevel &&
    tutor.educationLevels?.some((level) => normalize(level) === preferredLevel)
  ) {
    score += 10;
  }

  if (tutor.hasAvailability) {
    score += 5;
  }

  if (tutor.isVerified !== false) {
    score += 5;
  }

  return score;
}

export function recommendProfessors(
  tutors: Tutor[],
  context: RecommendationContext = {},
): Tutor[] {
  const limit = context.limit ?? 4;
  const exclude = new Set(context.excludeTutorIds ?? []);
  const subjects = context.subjectsFromBookings ?? [];

  return tutors
    .filter((tutor) => !exclude.has(tutor.id))
    .map((tutor) => ({
      tutor,
      score: scoreTutor(tutor, context.profile, subjects),
    }))
    .filter(({ score }) => score >= 20)
    .sort((a, b) => b.score - a.score || b.tutor.rating - a.tutor.rating)
    .slice(0, limit)
    .map(({ tutor }) => tutor);
}

export function hasRecommendationData(context: RecommendationContext): boolean {
  const hasProfile = Boolean(
    context.profile?.preferredSubject?.trim() ||
      context.profile?.preferredModality ||
      context.profile?.preferredCity?.trim(),
  );
  const hasHistory = (context.subjectsFromBookings?.length ?? 0) > 0;
  return hasProfile || hasHistory;
}
