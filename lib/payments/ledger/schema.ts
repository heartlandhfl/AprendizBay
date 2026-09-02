import type { PaymentProvider } from "@/lib/payments/gateway/types";

/**
 * Financial ledger — separate from booking documents.
 *
 * Document path: `payments/{paymentId}`
 *
 * `paymentId` is the canonical ledger document id, formatted as
 * `{provider}_{providerPaymentId}` (e.g. `mercadopago_123456789`).
 */
export const PAYMENTS_COLLECTION = "payments";

export type PaymentLedgerStatus =
  | "pending"
  | "checkout_created"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled"
  | "expired";

export interface PaymentLedgerRecord {
  /** Firestore document id (`{provider}_{providerPaymentId}`). */
  paymentId: string;
  bookingId: string;
  studentId: string;
  tutorId: string;
  provider: PaymentProvider;
  /** Provider-native payment identifier (Mercado Pago payment id, Asaas payment id, …). */
  providerPaymentId: string;
  /** Total amount charged to the student (BRL). */
  grossAmount: number;
  /** Platform commission taken from gross (BRL). */
  platformFee: number;
  /** Payment-provider processing fee (BRL). 0 until reported by the provider. */
  paymentProcessingFee: number;
  /** Platform revenue after processor fees: max(0, platformFee - paymentProcessingFee). */
  netPlatformRevenue: number;
  /** Tutor share before payout deductions: grossAmount - platformFee. */
  tutorGrossAmount: number;
  /** Amount owed to the tutor for payout (BRL). */
  tutorPayoutAmount: number;
  status: PaymentLedgerStatus;
  createdAt?: unknown;
  paidAt?: unknown;
  refundedAt?: unknown;
}

/**
 * Tutor payout batches — links one or more ledger payments to a disbursement.
 *
 * Document path: `tutorPayouts/{payoutId}`
 */
export const TUTOR_PAYOUTS_COLLECTION = "tutorPayouts";

export type TutorPayoutStatus = "pending" | "processing" | "paid" | "failed" | "cancelled";

export interface TutorPayoutRecord {
  payoutId: string;
  tutorId: string;
  /** Total disbursement amount (BRL). */
  amount: number;
  status: TutorPayoutStatus;
  /** Ledger `payments/{paymentId}` document ids included in this payout. */
  paymentIds: string[];
  createdAt?: unknown;
  paidAt?: unknown;
}

export function buildPaymentLedgerDocId(
  provider: PaymentProvider,
  providerPaymentId: string,
): string {
  const sanitized = providerPaymentId.trim().replace(/[/.#[\]*$]/g, "_").slice(0, 700);
  return `${provider}_${sanitized}`;
}

export interface PaymentLedgerAmountInput {
  grossAmount: number;
  platformFee: number;
  paymentProcessingFee?: number;
}

export interface PaymentLedgerAmounts {
  grossAmount: number;
  platformFee: number;
  paymentProcessingFee: number;
  netPlatformRevenue: number;
  tutorGrossAmount: number;
  tutorPayoutAmount: number;
}

/**
 * Derives ledger amounts from the booking fee split and an optional processor fee.
 *
 * Processor fees reduce platform revenue first; any remainder reduces the tutor payout.
 */
export function derivePaymentLedgerAmounts(
  input: PaymentLedgerAmountInput,
): PaymentLedgerAmounts {
  const grossAmount = roundMoney(input.grossAmount);
  const platformFee = roundMoney(input.platformFee);
  const paymentProcessingFee = roundMoney(input.paymentProcessingFee ?? 0);
  const tutorGrossAmount = roundMoney(grossAmount - platformFee);

  const feeFromPlatform = Math.min(platformFee, paymentProcessingFee);
  const feeFromTutor = roundMoney(paymentProcessingFee - feeFromPlatform);
  const netPlatformRevenue = roundMoney(platformFee - feeFromPlatform);
  const tutorPayoutAmount = roundMoney(Math.max(0, tutorGrossAmount - feeFromTutor));

  return {
    grossAmount,
    platformFee,
    paymentProcessingFee,
    netPlatformRevenue,
    tutorGrossAmount,
    tutorPayoutAmount,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
