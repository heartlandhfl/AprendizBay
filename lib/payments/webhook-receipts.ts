import type { AsaasWebhookMatch } from "@/lib/payments/asaas";

/** Admin SDK only. Client access is denied by the default Firestore catch-all. */
export const ASAAS_WEBHOOK_RECEIPTS_COLLECTION = "asaasWebhookReceipts";

export const WEBHOOK_ALREADY_PROCESSED_MESSAGE = "Evento já processado.";
export const WEBHOOK_UNAUTHORIZED_MESSAGE = "Webhook não autorizado.";
export const WEBHOOK_UNCONFIGURED_MESSAGE =
  "A configuração do webhook de pagamento não está disponível.";
export const WEBHOOK_INVALID_MESSAGE = "Webhook inválido.";
export const WEBHOOK_CONFIRMED_MESSAGE = "Pagamento confirmado.";
export const WEBHOOK_FAILED_MESSAGE = "Pagamento recusado.";
export const WEBHOOK_EXPIRED_MESSAGE = "Checkout expirado ou cancelado.";
export const WEBHOOK_CANCELLED_MESSAGE = "Reserva cancelada.";
export const WEBHOOK_BOOKING_NOT_FOUND_MESSAGE = "Reserva não encontrada.";

export type AsaasWebhookReceiptOutcome =
  | "confirmed"
  | "already_confirmed"
  | "cancelled"
  | "booking_not_found";

export interface AsaasWebhookReceipt {
  paymentId?: string;
  asaasCheckoutId?: string;
  bookingId?: string;
  event: string;
  outcome: AsaasWebhookReceiptOutcome;
  createdAt?: unknown;
}

function sanitizeReceiptIdPart(value: string): string {
  return value.trim().replace(/[/.#[\]*$]/g, "_").slice(0, 700);
}

export function asaasWebhookReceiptDocId(
  kind: "payment" | "checkout" | "booking-paid",
  id: string,
): string {
  return `${kind}_${sanitizeReceiptIdPart(id)}`;
}

export function buildAsaasWebhookReceiptIds(event: {
  paymentId?: string;
  asaasCheckoutId?: string;
  bookingId?: string;
}): string[] {
  const ids: string[] = [];

  if (event.paymentId) {
    ids.push(asaasWebhookReceiptDocId("payment", event.paymentId));
  }
  if (event.asaasCheckoutId) {
    ids.push(asaasWebhookReceiptDocId("checkout", event.asaasCheckoutId));
  }
  if (event.bookingId) {
    ids.push(asaasWebhookReceiptDocId("booking-paid", event.bookingId));
  }

  return [...new Set(ids)];
}

export function hasAsaasWebhookIdentity(event: Pick<AsaasWebhookMatch, "paymentId" | "asaasCheckoutId" | "bookingId">): boolean {
  return Boolean(event.paymentId || event.asaasCheckoutId || event.bookingId);
}
