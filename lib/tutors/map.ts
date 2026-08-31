import type { LessonType, Tutor } from "@/lib/mock-tutors";
import type { CollectiveHub, TutorProfile } from "@/lib/tutor-profiles";
import type {
  AdminTutorApplication,
  FirestoreCollectiveHubDoc,
  FirestoreTutorDoc,
} from "@/lib/tutors/firestore-types";
import {
  nonNegativeInteger,
  normalizeStringList,
  positiveNumber,
  trimToUndefined,
} from "@/lib/tutors/strings";
import {
  isMarketplaceVisible,
  resolveVerificationStatus,
} from "@/lib/tutors/verification";

function optionalList(value: unknown): string[] | undefined {
  const items = normalizeStringList(value);
  return items.length > 0 ? items : undefined;
}

function resolveLessonTypes(data: FirestoreTutorDoc): LessonType[] {
  if (Array.isArray(data.lessonTypes) && data.lessonTypes.length > 0) {
    return data.lessonTypes.filter(
      (type): type is LessonType => type === "individual" || type === "coletivo",
    );
  }

  const types: LessonType[] = [];
  if (typeof data.individualPrice === "number" && data.individualPrice > 0) {
    types.push("individual");
  }
  if (typeof data.collectivePrice === "number" && data.collectivePrice > 0) {
    types.push("coletivo");
  }
  return types;
}

export function mapFirestoreTutorDoc(id: string, data: FirestoreTutorDoc): Tutor {
  return {
    id,
    name: data.name,
    subject: data.subject,
    city: data.city,
    state: data.state,
    rating: typeof data.rating === "number" && Number.isFinite(data.rating) ? data.rating : 0,
    reviewCount: nonNegativeInteger(data.reviewCount),
    bio: data.bio,
    individualPrice: data.individualPrice,
    collectivePrice: data.collectivePrice,
    modality: data.modality,
    lessonTypes: resolveLessonTypes(data),
    isOnline: data.isOnline === true,
    avatarUrl: trimToUndefined(data.avatarUrl) ?? "",
    avatarColor: data.avatarColor ?? "bg-emerald-100",
  };
}

export function mapFirestoreCollectiveHubDoc(
  id: string,
  data: FirestoreCollectiveHubDoc,
): CollectiveHub {
  return {
    id,
    title: data.title,
    description: data.description,
    confirmedStudents: data.confirmedStudentIds.length,
    maxStudents: data.maxStudents,
    currentPrice: data.currentPrice,
    fullPrice: data.fullPrice,
    schedule: data.schedule,
    modality: data.modality,
  };
}

export function mapFirestoreTutorProfile(
  id: string,
  data: FirestoreTutorDoc,
  collectiveHubs: CollectiveHub[],
): TutorProfile {
  const base = mapFirestoreTutorDoc(id, data);
  const subjects = normalizeStringList(data.subjects);
  const qualifications = normalizeStringList(data.qualifications);

  return {
    ...base,
    headline: trimToUndefined(data.headline),
    isVerified: isMarketplaceVisible(data),
    hoursTaught: positiveNumber(data.hoursTaught),
    studentsServed: positiveNumber(data.studentsServed),
    about: trimToUndefined(data.about) ?? trimToUndefined(data.bio),
    methodology: trimToUndefined(data.methodology),
    experience: trimToUndefined(data.experience),
    qualifications: qualifications.length > 0 ? qualifications : undefined,
    subjects: subjects.length > 0 ? subjects : undefined,
    levels: optionalList(data.levels),
    languages: optionalList(data.languages),
    specialties: optionalList(data.specialties),
    responseTime: trimToUndefined(data.responseTime),
    firstLessonPrice: positiveNumber(data.firstLessonPrice),
    offersFreeTrial: data.offersFreeTrial === true ? true : undefined,
    collectiveHubs,
  };
}

export function mapAdminTutorApplication(
  id: string,
  data: FirestoreTutorDoc,
): AdminTutorApplication {
  const base = mapFirestoreTutorDoc(id, data);

  return {
    id,
    name: base.name,
    subject: base.subject,
    city: data.city,
    state: data.state,
    bio: data.bio,
    individualPrice: data.individualPrice,
    collectivePrice: data.collectivePrice,
    modality: data.modality,
    avatarUrl: base.avatarUrl,
    credentialFileName: data.credentialFileName,
    verificationStatus: resolveVerificationStatus(data),
    isVerified: isMarketplaceVisible(data),
    verificationReason: data.verificationReason,
    reviewedAt: data.reviewedAt,
    reviewedBy: data.reviewedBy,
  };
}
