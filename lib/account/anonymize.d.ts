export const ANONYMIZED_DISPLAY_NAME: string;
export const REDACTED_MESSAGE: string;

export function hasBlockingPaidBooking(
  bookings: Array<{ status?: string; paymentStatus?: string }>,
): boolean;

export function buildBookingAnonymizeUpdate(
  uid: string,
  data: { studentId?: string; tutorId?: string; status?: string; paymentStatus?: string },
): Record<string, unknown>;

export function buildReviewAnonymizeUpdate(
  uid: string,
  data: { studentId?: string; tutorId?: string },
): Record<string, unknown>;

export function buildTutorAnonymizeUpdate(deleteSentinel: unknown): Record<string, unknown>;

export function buildConversationAnonymizeUpdate(
  uid: string,
  data: { studentId?: string; tutorId?: string },
): Record<string, unknown>;

export function buildTutorHubCloseUpdate(): { status: string };

export function removeStudentFromHubIds(
  confirmedStudentIds: string[] | undefined,
  uid: string,
): string[];

export function removeStudentFromHub(
  data: {
    confirmedStudentIds?: string[];
    confirmedStudentCount?: number;
    maxStudents?: number;
    status?: string;
  },
  uid: string,
  options?: { decrement?: boolean },
): {
  confirmedStudentIds?: string[];
  confirmedStudentCount: number;
  status?: string;
};

export function anonymizeRelatedUserData(
  deps: { db: unknown; FieldValue: { serverTimestamp: () => unknown; delete: () => unknown } },
  uid: string,
): Promise<{
  bookings: number;
  reviews: number;
  conversations: number;
  hubsClosed: number;
}>;

export function deleteUserAccount(
  deps: {
    db: unknown;
    FieldValue: { serverTimestamp: () => unknown; delete: () => unknown };
    deleteAuthUser: (uid: string) => Promise<void>;
    deleteStoragePrefixes?: (prefixes: string[]) => Promise<void>;
  },
  uid: string,
): Promise<{
  deletedUser: boolean;
  bookings: number;
  reviews: number;
  conversations: number;
  hubsClosed: number;
}>;
