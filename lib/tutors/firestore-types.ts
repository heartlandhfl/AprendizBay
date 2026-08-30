import type { Modality } from "@/lib/mock-tutors";

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
  isOnline: boolean;
  hoursTaught?: number;
  studentsServed?: number;
  rating: number;
  reviewCount: number;
  avatarUrl?: string;
  avatarColor?: string;
}

export interface FirestoreCollectiveHubDoc {
  tutorId: string;
  title: string;
  description: string;
  maxStudents: number;
  confirmedStudentIds: string[];
  currentPrice: number;
  fullPrice: number;
  schedule: string;
  modality: "online" | "presencial";
  status: string;
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
