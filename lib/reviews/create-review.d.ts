export const MAX_COMMENT_LENGTH: number;
export const MAX_REVIEW_ID_LENGTH: number;
export const VALID_RATINGS: readonly number[];

export type CreateReviewErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_BOOKING"
  | "INVALID_TUTOR"
  | "INVALID_RATING"
  | "INVALID_COMMENT"
  | "BOOKING_NOT_FOUND"
  | "FORBIDDEN_STUDENT"
  | "BOOKING_NOT_COMPLETED"
  | "DUPLICATE_REVIEW";

export const REVIEW_ERROR_STATUS: Record<CreateReviewErrorCode, number>;

export interface ValidatedReviewFields {
  actorUid: string;
  bookingId: string;
  tutorId: string;
  rating: number;
  comment: string;
}

export interface CreateReviewResult {
  reviewId: string;
  tutorId: string;
  bookingId: string;
}

export interface ReviewIdMigrationPlan {
  moves: Array<{ bookingId: string; sourceId: string; destId: string }>;
  skippedExisting: Array<{ bookingId: string; reviewId: string; reason: string }>;
  leftovers: Array<{ bookingId: string; reviewId: string; reason: string }>;
  skippedInvalid: Array<{
    reviewId: string;
    bookingId: string | null;
    reason: string;
  }>;
}

export function reviewDocumentId(bookingId: unknown): string;
export function isValidRating(value: unknown): boolean;
export function validateReviewFields(input: {
  actorUid?: unknown;
  bookingId?: unknown;
  tutorId?: unknown;
  rating?: unknown;
  comment?: unknown;
}): ValidatedReviewFields;

export function assertCanCreateReview(input: {
  actorUid: string;
  booking: { studentId?: unknown; tutorId?: unknown; status?: unknown } | null;
  existingReview: unknown;
  tutorId: string;
}): void;

export function ratingsFromReviewDocs(
  docs: Array<{ id?: string; data?: () => Record<string, unknown> } & Record<string, unknown>>,
): number[];

export function computeTutorRatingFromRatings(ratings: unknown[]): {
  rating: number;
  reviewCount: number;
};

export function statusFromCreateReviewError(error: unknown): number;

export function findExistingReviewForBooking(
  db: {
    collection: (name: string) => {
      doc: (id: string) => { get: () => Promise<{ exists: boolean; id?: string; data: () => unknown }> };
      where: (
        field: string,
        op: string,
        value: string,
      ) => {
        limit: (n: number) => {
          get: () => Promise<{ empty: boolean; docs: Array<{ id: string; data: () => unknown }> }>;
        };
      };
    };
  },
  bookingId: string,
): Promise<{ id: string; data: unknown } | null>;

export function createReviewForStudent(
  db: {
    collection: (name: string) => unknown;
    runTransaction: (fn: (tx: unknown) => Promise<CreateReviewResult>) => Promise<CreateReviewResult>;
  },
  input: {
    actorUid?: unknown;
    bookingId?: unknown;
    tutorId?: unknown;
    rating?: unknown;
    comment?: unknown;
  },
  deps?: { timestamp?: unknown },
): Promise<CreateReviewResult>;

export function planReviewIdMigration(
  docs: Array<{ id: string; bookingId?: unknown; createdAt?: unknown }>,
): ReviewIdMigrationPlan;
