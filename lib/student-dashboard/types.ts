import type { Booking } from "@/lib/bookings/types";
import type { Modality } from "@/lib/mock-tutors";

export interface EnrichedStudentBooking {
  booking: Booking;
  tutorName: string;
  subject: string;
  modality: Modality;
}

export type PendingActionType =
  | "payment_pending"
  | "request_pending"
  | "new_message"
  | "upcoming_lesson"
  | "review_pending";

export interface PendingAction {
  id: string;
  type: PendingActionType;
  title: string;
  description: string;
  href: string;
  priority: number;
}

export interface LearningSummary {
  upcomingCount: number;
  professorCount: number;
  classCount: number;
  historyCount: number;
  upcomingPreview: EnrichedStudentBooking[];
  professors: Array<{ tutorId: string; tutorName: string }>;
}

export const LEARNING_OBJECTIVES = [
  "Reforço escolar",
  "Preparação para ENEM",
  "Vestibular",
  "Faculdade",
  "Desenvolvimento profissional",
  "Aprender por interesse pessoal",
  "Outro",
] as const;

export type LearningObjective = (typeof LEARNING_OBJECTIVES)[number];

export interface StudentLearningProfile {
  city?: string;
  state?: string;
  phone?: string;
  preferredSubject?: string;
  preferredLevel?: string;
  preferredModality?: Modality | "";
  preferredCity?: string;
  learningObjective?: string;
}

export interface LessonCta {
  label: "Entrar na aula" | "Ver aula";
  href: string;
  external?: boolean;
}
