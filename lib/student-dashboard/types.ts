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

export interface StudentLearningProfile {
  preferredSubject?: string;
  preferredLevel?: string;
  preferredModality?: Modality | "";
  preferredCity?: string;
}

export interface LessonCta {
  label: "Entrar na aula" | "Ver aula";
  href: string;
  external?: boolean;
}
