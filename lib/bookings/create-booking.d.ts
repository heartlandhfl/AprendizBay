export const LESSON_SLOTS_COLLECTION: "lessonSlots";

export type CreateBookingErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN_ROLE"
  | "INVALID_TUTOR"
  | "INVALID_SLOT"
  | "SLOT_IN_PAST"
  | "INVALID_PRICE"
  | "TUTOR_UNAVAILABLE"
  | "COLLECTIVE_PATH"
  | "SLOT_TAKEN";

export const CREATE_BOOKING_ERRORS: Record<CreateBookingErrorCode, string>;
export const CREATE_BOOKING_ERROR_STATUS: Record<CreateBookingErrorCode, number>;

export function individualLessonSlotKey(tutorId: unknown, scheduledAt: unknown): string;

export function evaluateIndividualSlotClaim(input: {
  tutorId: unknown;
  scheduledAt: unknown;
  occupiedStarts: unknown;
}):
  | { ok: true; slotKey: string }
  | { ok: false; code: CreateBookingErrorCode; message: string };

export function simulateConcurrentIndividualBookings(
  occupiedStarts: string[],
  attempts: Array<{ studentId: string; tutorId: unknown; scheduledAt: unknown }>,
): {
  occupiedStarts: string[];
  results: Array<
    | { studentId: string; ok: true; slotKey: string }
    | { studentId: string; ok: false; code: CreateBookingErrorCode; message: string }
  >;
};

export function assertCanCreateIndividualBooking(
  input: {
    actorUid?: unknown;
    tutorId?: unknown;
    type?: unknown;
    scheduledAt?: unknown;
    price?: unknown;
  },
  now?: Date,
): {
  actorUid: string;
  tutorId: string;
  scheduledAt: Date;
  price: number;
};

export function statusFromCreateBookingError(error: unknown): number;

export function createIndividualBookingForStudent(
  db: {
    collection: (name: string) => unknown;
    runTransaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
  },
  input: {
    actorUid?: unknown;
    actorRole?: unknown;
    tutorId?: unknown;
    type?: unknown;
    scheduledAt?: unknown;
    price?: unknown;
    platformFee?: unknown;
    tutorAmount?: unknown;
  },
  deps?: { timestamp?: unknown; now?: Date },
): Promise<{ bookingId: string; slotKey: string }>;
