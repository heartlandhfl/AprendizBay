import type { Tutor } from "@/lib/mock-tutors";
import { toPublicCollectiveHub } from "@/lib/hubs/public";
import type { CollectiveHub, TutorProfile } from "@/lib/tutor-profiles";
import type {
  AdminTutorApplication,
  FirestoreCollectiveHubDoc,
  FirestoreTutorDoc,
} from "@/lib/tutors/firestore-types";
import {
  isMarketplaceVisible,
  resolveVerificationStatus,
} from "@/lib/tutors/verification";

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
  const publicHub = toPublicCollectiveHub(id, data as Record<string, unknown>);

  return {
    id: publicHub.id,
    title: publicHub.title,
    description: publicHub.description,
    confirmedStudents: publicHub.confirmedStudents,
    maxStudents: publicHub.maxStudents,
    currentPrice: publicHub.currentPrice,
    fullPrice: publicHub.fullPrice,
    schedule: publicHub.schedule,
    modality: publicHub.modality,
    subject: publicHub.subject || undefined,
    tutorName: publicHub.tutorName || undefined,
    scheduledDate: publicHub.scheduledDate || undefined,
    startTime: publicHub.startTime || undefined,
    individualPrice: publicHub.individualPrice || undefined,
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
    isVerified: isMarketplaceVisible(data),
    hoursTaught: data.hoursTaught ?? 0,
    studentsServed: data.studentsServed ?? 0,
    about: data.about ?? base.bio,
    methodology: data.methodology ?? "",
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
