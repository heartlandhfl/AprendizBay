/** Admin SDK only. Client access is denied by Firestore rules. */
export const PAYMENT_WEBHOOK_RECEIPTS_COLLECTION = "paymentWebhookReceipts";

export type PaymentWebhookReceiptOutcome =
  | "paid"
  | "already_processed"
  | "cancelled"
  | "booking_not_found"
  | "amount_mismatch"
  | "failed"
  | "expired"
  | "refunded"
  | "ignored";

export interface PaymentWebhookReceipt {
  eventId: string;
  provider: "mercadopago" | "asaas" | "infinitepay";
  paymentId?: string;
  bookingId?: string;
  status?: string;
  outcome: PaymentWebhookReceiptOutcome;
  expectedAmountCents?: number;
  paidAmountCents?: number | null;
  mismatchReason?: string;
  createdAt?: unknown;
}

function sanitizeReceiptIdPart(value: string): string {
  return value.trim().replace(/[/.#[\]*$]/g, "_").slice(0, 700);
}

export function buildPaymentWebhookEventId(provider: string, paymentId: string): string {
  return `${sanitizeReceiptIdPart(provider)}_${sanitizeReceiptIdPart(paymentId)}`;
}
