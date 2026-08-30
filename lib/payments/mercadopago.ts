export const MERCADO_PAGO_API_URL = "https://api.mercadopago.com";

export interface MercadoPagoRefundResult {
  id: string;
  paymentId: string;
  status?: string;
  amount?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured.");
  }
  return token;
}

export function buildMercadoPagoRefundUrl(paymentId: string): string {
  return `${MERCADO_PAGO_API_URL}/v1/payments/${encodeURIComponent(paymentId)}/refunds`;
}

export function buildMercadoPagoRefundHeaders(idempotencyKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": idempotencyKey,
  };
}

export function resolveMercadoPagoPaymentId(booking: {
  mercadoPagoPaymentId?: string;
  paymentId?: string;
}): string | undefined {
  return readString(booking.mercadoPagoPaymentId) ?? readString(booking.paymentId);
}

export function parseMercadoPagoRefund(payload: unknown): MercadoPagoRefundResult {
  if (!isRecord(payload)) {
    throw new Error("Resposta de reembolso do Mercado Pago inválida.");
  }

  const id = payload.id != null ? String(payload.id) : "";
  if (!id) {
    throw new Error("O Mercado Pago não devolveu o identificador do reembolso.");
  }

  const amount =
    typeof payload.amount === "number" && Number.isFinite(payload.amount)
      ? payload.amount
      : undefined;

  return {
    id,
    paymentId: payload.payment_id != null ? String(payload.payment_id) : "",
    status: readString(payload.status),
    amount,
  };
}

function mercadoPagoErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  const message = readString(payload.message) ?? readString(payload.error);
  return message ? `Mercado Pago: ${message}` : fallback;
}

export async function refundMercadoPagoPayment(input: {
  paymentId: string;
  idempotencyKey: string;
  amount?: number;
}): Promise<MercadoPagoRefundResult> {
  const response = await fetch(buildMercadoPagoRefundUrl(input.paymentId), {
    method: "POST",
    headers: buildMercadoPagoRefundHeaders(input.idempotencyKey),
    body:
      typeof input.amount === "number" && Number.isFinite(input.amount)
        ? JSON.stringify({ amount: input.amount })
        : JSON.stringify({}),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      mercadoPagoErrorMessage(
        payload,
        `Não foi possível reembolsar o pagamento no Mercado Pago (${response.status}).`,
      ),
    );
  }

  return parseMercadoPagoRefund(payload);
}
