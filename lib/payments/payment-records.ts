import type { PaymentProvider, PaymentStatus } from "@/lib/payments/gateway/types";

/** Admin SDK only. Client access is denied by Firestore rules. */
export const PAYMENTS_COLLECTION = "payments";

export interface PaymentRecord {
  bookingId: string;
  provider: PaymentProvider;
  paymentId: string;
  checkoutId?: string;
  status: PaymentStatus;
  amount?: number;
  refundId?: string;
  refundAmount?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export function paymentRecordDocId(provider: PaymentProvider, paymentId: string): string {
  return `${provider}_${paymentId.trim().replace(/[/.#[\]*$]/g, "_").slice(0, 700)}`;
}
