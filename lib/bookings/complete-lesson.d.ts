export const COMPLETE_COPY: {
  tutorSectionTitle: string;
  tutorSectionHelp: string;
  tutorButton: string;
  tutorSubmitting: string;
  tutorBeforeSchedule: string;
  tutorNeedsPayment: string;
  studentCompleted: string;
  studentCompletedReviewed: string;
};

export type CompleteLessonErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_BOOKING"
  | "BOOKING_NOT_FOUND"
  | "FORBIDDEN"
  | "PENDING"
  | "CANCELLED"
  | "UNPAID"
  | "ALREADY_COMPLETED"
  | "TOO_EARLY";

export const COMPLETE_ERROR_STATUS: Record<CompleteLessonErrorCode, number>;

export function normalizeBookingId(bookingId: unknown): string;

export function hasScheduledTimePassed(scheduledAt: unknown, now?: Date): boolean;

export function resolveCompleteActor(
  booking: { tutorId?: unknown } | null | undefined,
  actorUid: unknown,
  actorRole?: unknown,
): "tutor" | "admin" | null;

export function assertCanCompleteLesson(input: {
  actorUid?: unknown;
  actorRole?: unknown;
  booking: {
    studentId?: unknown;
    tutorId?: unknown;
    status?: unknown;
    paymentStatus?: unknown;
    scheduledAt?: unknown;
  } | null;
  now?: Date;
}): void;

export function studentCompletedLessonCopy(
  status: unknown,
  alreadyReviewed: unknown,
): string | null;

export function canTutorMarkCompleted(
  booking: {
    status?: unknown;
    paymentStatus?: unknown;
    scheduledAt?: unknown;
  } | null,
  now?: Date,
): boolean;

export function statusFromCompleteLessonError(error: unknown): number;

export function completeLessonForActor(
  db: {
    collection: (name: string) => unknown;
    runTransaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
  },
  input: {
    actorUid?: unknown;
    bookingId?: unknown;
    actorRole?: unknown;
  },
  deps?: { timestamp?: unknown; now?: Date },
): Promise<{ bookingId: string; status: "completed" }>;
