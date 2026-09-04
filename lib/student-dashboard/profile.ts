import type { StudentLearningProfile } from "@/lib/student-dashboard/types";

export function isStudentLearningProfileComplete(
  profile: StudentLearningProfile | null | undefined,
): boolean {
  if (!profile?.preferredSubject?.trim()) {
    return false;
  }

  if (!profile.preferredModality) {
    return false;
  }

  if (profile.preferredModality === "presencial" && !profile.preferredCity?.trim()) {
    return false;
  }

  return true;
}

export function inferSubjectsFromBookings(subjects: string[]): string[] {
  return Array.from(
    new Set(subjects.map((subject) => subject.trim()).filter(Boolean)),
  );
}

export function shouldPromptProfileCompletion(
  profile: StudentLearningProfile | null | undefined,
  bookingCount: number,
): boolean {
  if (bookingCount > 0) {
    return false;
  }

  return !isStudentLearningProfileComplete(profile);
}
