export type JoinAndBookErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN_ROLE"
  | "INVALID_HUB"
  | "INVALID_PRICE"
  | "INVALID_SLOT"
  | "not_found"
  | "already_joined"
  | "full"
  | "closed"
  | "cancelled"
  | "unauthorized";

export const JOIN_AND_BOOK_ERRORS: Record<
  "UNAUTHENTICATED" | "FORBIDDEN_ROLE" | "INVALID_HUB" | "INVALID_PRICE" | "INVALID_SLOT",
  string
>;
export const JOIN_AND_BOOK_ERROR_STATUS: Record<string, number>;

export function assertCanJoinCollectiveClass(input: {
  actorUid?: unknown;
  hubId?: unknown;
}): { actorUid: string; hubId: string };

export function scheduledAtFromHub(hub: {
  scheduledDate?: unknown;
  startTime?: unknown;
}): Date | null;

export function statusFromJoinAndBookError(error: unknown): number;

export function createCollectiveBookingForStudent(
  db: {
    collection: (name: string) => unknown;
    runTransaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
  },
  input: {
    actorUid?: unknown;
    actorRole?: unknown;
    hubId?: unknown;
    tutorId?: unknown;
    price?: unknown;
    scheduledAt?: unknown;
  },
  deps?: { timestamp?: unknown; now?: Date },
): Promise<{ bookingId: string; hubId: string; price: number }>;
