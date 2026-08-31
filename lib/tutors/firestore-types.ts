import type { Modality } from "@/lib/mock-tutors";
import type { VerificationStatus } from "@/lib/tutors/verification";

export interface FirestoreTutorDoc {
  userId: string;
  name: string;
  subject: string;
  city: string;
  state: string;
  bio: string;
  about?: string;
  methodology?: string;
  headline?: string;
  individualPrice: number;
  collectivePrice: number;
  modality: Modality;
  lessonTypes?: Array<"individual" | "coletivo">;
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  reviewedAt?: unknown;
  reviewedBy?: string;
  verificationReason?: string;
  isOnline: boolean;
  hoursTaught?: number;
  studentsServed?: number;
  rating: number;
  reviewCount: number;
  avatarUrl?: string;
  avatarColor?: string;
  credentialFileName?: string;
}

export interface AdminTutorApplication {
  id: string;
  name: string;
  subject: string;
  city: string;
  state: string;
  bio: string;
  individualPrice: number;
  collectivePrice: number;
  modality: Modality;
  avatarUrl: string;
  credentialFileName?: string;
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  verificationReason?: string;
  reviewedAt?: unknown;
  reviewedBy?: string;
}

export interface FirestoreCollectiveHubDoc {
  tutorId: string;
  title: string;
  description: string;
  maxStudents: number;
  confirmedStudentIds?: string[];
  confirmedStudentCount?: number;
  currentPrice: number;
  fullPrice: number;
  schedule: string;
  modality: "online" | "presencial";
  status: string;
  subject?: string;
  tutorName?: string;
  scheduledDate?: string;
  startTime?: string;
  individualPrice?: number;
}

export interface FirestoreAvailabilitySlot {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface FirestoreAvailabilityDoc {
  slots: FirestoreAvailabilitySlot[];
}

export interface TutorQueryFilters {
  subject?: string;
  city?: string;
  modality?: Modality | "todos";
}
