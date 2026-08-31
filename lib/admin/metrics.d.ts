export const RECORDED_REFUND_STATUSES: Set<string>;
export const TUTOR_STATUSES: readonly string[];

export type AdminMetric = { available: true; value: number } | { available: false };

export interface AdminReviewItem {
  id: string;
  tutorId: string;
  studentId: string;
  bookingId: string;
  rating: number;
  comment: string;
  createdAt: string | null;
}

export function availableMetric(value: number): AdminMetric;
export function unavailableMetric(): AdminMetric;
export function hasRecordedRefund(booking: {
  refundId?: string;
  refundStatus?: string;
}): boolean;
export function countTutorStatuses(tutorDocs: Array<{
  isVerified?: boolean;
  verificationStatus?: string;
}>): Record<"pending" | "approved" | "changes_requested" | "rejected" | "suspended", number>;
export function emptyTutorStatusCounts(): Record<
  "pending" | "approved" | "changes_requested" | "rejected" | "suspended",
  number
>;
export function summarizeMoneyField(
  rows: Array<Record<string, unknown>>,
  field: string,
): AdminMetric;
export function summarizePaidBookings(paidBookings: Array<Record<string, unknown>>): {
  gross: AdminMetric;
  platformFees: AdminMetric;
  tutorAmount: AdminMetric;
};
export function summarizeRefunds(bookings: Array<Record<string, unknown>>): {
  count: AdminMetric;
  amount: AdminMetric;
};
export function serializeReview(id: string, data?: Record<string, unknown> | null): AdminReviewItem;
export function serializeTimestamp(value: unknown): string | null;
