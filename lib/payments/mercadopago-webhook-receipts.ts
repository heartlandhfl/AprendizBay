/** Admin SDK only. Client access is denied by Firestore rules. */
export const MERCADOPAGO_WEBHOOK_RECEIPTS_COLLECTION = "mercadopagoWebhookReceipts";

export type MercadoPagoPaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "in_process"
  | "in_mediation"
  | "charged_back"
  | "authorized";

export type MercadoPagoWebhookReceiptOutcome =
  | "approved"
  | "already_confirmed"
  | "cancelled"
  | "booking_not_found"
  | "amount_mismatch"
  | "rejected"
  | "cancelled_payment"
  | "refunded";

export interface MercadoPagoWebhookReceipt {
  paymentId: string;
  bookingId?: string;
  notificationId?: string;
  requestId?: string;
  mpStatus?: MercadoPagoPaymentStatus;
  outcome: MercadoPagoWebhookReceiptOutcome;
  expectedAmountCents?: number;
  paidAmountCents?: number | null;
  mismatchReason?: string;
  createdAt?: unknown;
}

function sanitizeReceiptIdPart(value: string): string {
  return value.trim().replace(/[/.#[\]*$]/g, "_").slice(0, 700);
}

export function mercadopagoWebhookReceiptDocId(
  kind: "payment" | "notification" | "booking-paid",
  id: string,
): string {
  return `${kind}_${sanitizeReceiptIdPart(id)}`;
}

export function buildMercadoPagoWebhookReceiptIds(event: {
  paymentId: string;
  notificationId?: string;
  bookingId?: string;
}): string[] {
  const ids: string[] = [mercadopagoWebhookReceiptDocId("payment", event.paymentId)];

  if (event.notificationId) {
    ids.push(mercadopagoWebhookReceiptDocId("notification", event.notificationId));
  }
  if (event.bookingId) {
    ids.push(mercadopagoWebhookReceiptDocId("booking-paid", event.bookingId));
  }

  return [...new Set(ids)];
}

export function mapMercadoPagoStatusToPaymentStatus(
  status: MercadoPagoPaymentStatus | undefined,
): "awaiting_payment" | "paid" | "failed" | "expired" | null {
  switch (status) {
    case "approved":
      return "paid";
    case "pending":
    case "in_process":
    case "authorized":
    case "in_mediation":
      return "awaiting_payment";
    case "rejected":
      return "failed";
    case "cancelled":
      return "expired";
    case "refunded":
    case "charged_back":
      return null;
    default:
      return null;
  }
}
