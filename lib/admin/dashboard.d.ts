import type { AdminMetric, AdminReviewItem } from "./metrics";

export const RECENT_REVIEW_LIMIT: number;

export interface AdminOperationsDashboard {
  generatedAt: string;
  overview: {
    students: AdminMetric;
    tutors: AdminMetric;
    pendingTutors: AdminMetric;
    pendingBookings: AdminMetric;
    confirmedBookings: AdminMetric;
    completedBookings: AdminMetric;
    awaitingPayments: AdminMetric;
    completedPayments: AdminMetric;
    cancellations: AdminMetric;
    refunds: AdminMetric;
  };
  tutors: {
    pending: AdminMetric;
    approved: AdminMetric;
    changesRequested: AdminMetric;
    rejected: AdminMetric;
    suspended: AdminMetric;
  };
  bookings: {
    pending: AdminMetric;
    awaitingPayment: AdminMetric;
    confirmed: AdminMetric;
    completed: AdminMetric;
    cancelled: AdminMetric;
  };
  payments: {
    gross: AdminMetric;
    platformFees: AdminMetric;
    tutorAmount: AdminMetric;
    refunds: AdminMetric;
  };
  reviews: {
    recent: AdminReviewItem[];
    recentAvailable: boolean;
    reported: AdminMetric;
  };
  users: {
    students: AdminMetric;
    tutors: AdminMetric;
    suspendedAccounts: AdminMetric;
  };
}

export function buildAdminOperationsDashboard(
  deps: { db: unknown },
  options?: { reviewLimit?: number },
): Promise<AdminOperationsDashboard>;

export function countWhere(
  db: unknown,
  collectionName: string,
  field: string,
  value: unknown,
): Promise<number>;
