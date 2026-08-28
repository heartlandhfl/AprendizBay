import type { Tutor } from "@/lib/mock-tutors";
import type { CollectiveHub, TutorProfile } from "@/lib/tutor-profiles";
import type { FirestoreCollectiveHubDoc, FirestoreTutorDoc } from "@/lib/tutors/firestore-types";

const DEFAULT_LESSON_TYPES: Array<"individual" | "coletivo"> = ["individual", "coletivo"];

export function mapFirestoreTutorDoc(id: string, data: FirestoreTutorDoc): Tutor {
  return {
    id,
    name: data.name,
    subject: data.subject,
    city: data.city,
    state: data.state,
    rating: data.rating,
    reviewCount: data.reviewCount,
    bio: data.bio,
    individualPrice: data.individualPrice,
    collectivePrice: data.collectivePrice,
    modality: data.modality,
    lessonTypes: data.lessonTypes ?? DEFAULT_LESSON_TYPES,
    isOnline: data.isOnline,
    avatarUrl:
      data.avatarUrl ??
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=d1fae5`,
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

  return {
    ...base,
    headline: data.headline ?? base.bio,
    isVerified: data.isVerified,
    hoursTaught: data.hoursTaught ?? 0,
    studentsServed: data.studentsServed ?? 0,
    about: data.about ?? base.bio,
    methodology: data.methodology ?? "",
    collectiveHubs,
  };
}
