import type { LessonType } from "@/lib/mock-tutors";
import type { TutorProfile } from "@/lib/tutor-profiles";

export function hasApprovedVerification(tutor: Pick<TutorProfile, "isVerified">): boolean {
  return tutor.isVerified === true;
}

export function hasPublicRating(tutor: Pick<TutorProfile, "rating" | "reviewCount">): boolean {
  return (
    tutor.reviewCount > 0 &&
    typeof tutor.rating === "number" &&
    Number.isFinite(tutor.rating) &&
    tutor.rating > 0
  );
}

export function offeredLessonTypes(
  tutor: Pick<TutorProfile, "lessonTypes" | "individualPrice" | "collectivePrice">,
): LessonType[] {
  if (Array.isArray(tutor.lessonTypes) && tutor.lessonTypes.length > 0) {
    return tutor.lessonTypes.filter(
      (type): type is LessonType => type === "individual" || type === "coletivo",
    );
  }

  const types: LessonType[] = [];
  if (typeof tutor.individualPrice === "number" && tutor.individualPrice > 0) {
    types.push("individual");
  }
  if (typeof tutor.collectivePrice === "number" && tutor.collectivePrice > 0) {
    types.push("coletivo");
  }
  return types;
}

export function offersLessonType(
  tutor: Pick<TutorProfile, "lessonTypes" | "individualPrice" | "collectivePrice">,
  type: LessonType,
): boolean {
  return offeredLessonTypes(tutor).includes(type);
}

export function presentationText(
  tutor: Pick<TutorProfile, "about" | "bio">,
): string | undefined {
  return tutor.about?.trim() || tutor.bio?.trim() || undefined;
}

export function teachingSubjects(
  tutor: Pick<TutorProfile, "subjects" | "subject">,
): string[] {
  if (tutor.subjects && tutor.subjects.length > 0) {
    return tutor.subjects;
  }

  const subject = tutor.subject?.trim();
  return subject ? [subject] : [];
}

export function hasExperienceSection(
  tutor: Pick<TutorProfile, "experience" | "hoursTaught" | "studentsServed">,
): boolean {
  return Boolean(
    tutor.experience?.trim() ||
      (tutor.hoursTaught && tutor.hoursTaught > 0) ||
      (tutor.studentsServed && tutor.studentsServed > 0),
  );
}

export function hasTeachingDetails(
  tutor: Pick<TutorProfile, "subjects" | "subject" | "levels" | "languages" | "specialties">,
): boolean {
  return (
    teachingSubjects(tutor).length > 0 ||
    (tutor.levels?.length ?? 0) > 0 ||
    (tutor.languages?.length ?? 0) > 0 ||
    (tutor.specialties?.length ?? 0) > 0
  );
}

export function hasFirstLessonOffer(
  tutor: Pick<TutorProfile, "firstLessonPrice" | "offersFreeTrial">,
): boolean {
  return tutor.offersFreeTrial === true || (tutor.firstLessonPrice ?? 0) > 0;
}

export function hasPricingSection(
  tutor: Pick<
    TutorProfile,
    | "lessonTypes"
    | "individualPrice"
    | "collectivePrice"
    | "firstLessonPrice"
    | "offersFreeTrial"
  >,
): boolean {
  return offeredLessonTypes(tutor).length > 0 || hasFirstLessonOffer(tutor);
}

export function defaultBookingOption(
  tutor: Pick<TutorProfile, "lessonTypes" | "individualPrice" | "collectivePrice">,
): LessonType | null {
  const types = offeredLessonTypes(tutor);
  if (types.includes("coletivo")) {
    return "coletivo";
  }
  return types[0] ?? null;
}
