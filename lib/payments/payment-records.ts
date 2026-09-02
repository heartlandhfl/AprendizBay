import type { PaymentProvider, PaymentStatus } from "@/lib/payments/gateway/types";
import {
  buildPaymentLedgerDocId,
  type PaymentLedgerRecord,
  type PaymentLedgerStatus,
  PAYMENTS_COLLECTION,
} from "@/lib/payments/ledger/schema";

export { PAYMENTS_COLLECTION, buildPaymentLedgerDocId };
export type { PaymentLedgerRecord, PaymentLedgerStatus };

/** @deprecated Use PaymentLedgerRecord from lib/payments/ledger/schema instead. */
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

/** @deprecated Use buildPaymentLedgerDocId instead. */
export function paymentRecordDocId(provider: PaymentProvider, paymentId: string): string {
  return buildPaymentLedgerDocId(provider, paymentId);
}
