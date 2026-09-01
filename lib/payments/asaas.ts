import { timingSafeEqual } from "node:crypto";
import {
  WEBHOOK_UNAUTHORIZED_MESSAGE,
  WEBHOOK_UNCONFIGURED_MESSAGE,
} from "@/lib/payments/webhook-receipts";

export const ASAAS_SANDBOX_API_URL = "https://api-sandbox.asaas.com/v3";
export const ASAAS_PRODUCTION_API_URL = "https://api.asaas.com/v3";
export const ASAAS_CHECKOUT_PAGE_URL = "https://asaas.com/checkoutSession/show";

const PLACEHOLDER_ITEM_IMAGE =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

export const SUCCESSFUL_PAYMENT_EVENTS = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "CHECKOUT_PAID",
]);

export const FAILED_PAYMENT_EVENTS = new Set([
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
]);

export const EXPIRED_CHECKOUT_EVENTS = new Set([
  "CHECKOUT_EXPIRED",
  "CHECKOUT_CANCELED",
  "CHECKOUT_CANCELLED",
  "PAYMENT_DELETED",
  "PAYMENT_OVERDUE",
]);

export type AsaasWebhookOutcome = "successful" | "failed" | "expired" | "ignored";

export interface AsaasCustomerData {
  name: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  address: string;
  addressNumber: string;
  postalCode: string;
  province: string;
}

export interface CreateAsaasCheckoutInput {
  bookingId: string;
  itemName: string;
  itemDescription?: string;
  value: number;
  customer: AsaasCustomerData;
  successUrl: string;
  cancelUrl: string;
  expiredUrl?: string;
  minutesToExpire?: number;
}

export interface AsaasCheckoutResult {
  id: string;
  checkoutUrl: string;
  status?: string;
}

export interface AsaasWebhookMatch {
  event: string;
  isSuccessfulPayment: boolean;
  outcome?: AsaasWebhookOutcome;
  bookingId?: string;
  paymentId?: string;
  asaasCheckoutId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getAsaasApiBaseUrl(): string {
  if (process.env.ASAAS_ENVIRONMENT === "production") {
    return ASAAS_PRODUCTION_API_URL;
  }
  return ASAAS_SANDBOX_API_URL;
}

export function getAsaasAccessToken(): string {
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ASAAS_API_KEY is not configured.");
  }
  return apiKey;
}

export function asaasRequestHeaders(): Record<string, string> {
  return {
    accept: "application/json",
    "content-type": "application/json",
    access_token: getAsaasAccessToken(),
    "User-Agent": "AprendizBay/1.0.0",
  };
}

export const ASAAS_REFUND_TIMEOUT_MS = 20_000;

export const SUCCESSFUL_ASAAS_REFUND_STATUSES = new Set([
  "REFUNDED",
  "REFUND_REQUESTED",
  "REFUND_IN_PROGRESS",
]);

export const SUCCESSFUL_ASAAS_REFUND_ITEM_STATUSES = new Set(["DONE", "PENDING"]);

export interface AsaasRefundResult {
  paymentId: string;
  status?: string;
  refundId?: string;
  refundAmount?: number;
}

export function buildAsaasRefundUrl(paymentId: string): string {
  return `${getAsaasApiBaseUrl()}/payments/${encodeURIComponent(paymentId)}/refund`;
}

export function resolveAsaasPaymentId(booking: {
  paymentId?: string;
}): string | undefined {
  return readString(booking.paymentId);
}

export function parseAsaasRefund(payload: unknown): AsaasRefundResult {
  if (!isRecord(payload)) {
    throw new Error("Resposta de reembolso do Asaas inválida.");
  }

  const paymentId = readString(payload.id);
  if (!paymentId) {
    throw new Error("O Asaas não devolveu o identificador do pagamento estornado.");
  }

  const refunds = Array.isArray(payload.refunds) ? payload.refunds : [];
  const latestRefund = refunds.filter(isRecord).at(-1);
  const latestRefundStatus = latestRefund ? readString(latestRefund.status)?.toUpperCase() : undefined;
  const paymentStatus = readString(payload.status)?.toUpperCase();
  const refundAmount =
    latestRefund && typeof latestRefund.value === "number" && Number.isFinite(latestRefund.value)
      ? latestRefund.value
      : typeof payload.value === "number" && Number.isFinite(payload.value)
        ? payload.value
        : undefined;

  const statusConfirmed =
    Boolean(paymentStatus && SUCCESSFUL_ASAAS_REFUND_STATUSES.has(paymentStatus)) ||
    Boolean(latestRefundStatus && SUCCESSFUL_ASAAS_REFUND_ITEM_STATUSES.has(latestRefundStatus));

  if (!statusConfirmed) {
    throw new Error("O Asaas não confirmou o estorno do pagamento.");
  }

  return {
    paymentId,
    status: paymentStatus ?? latestRefundStatus,
    refundId:
      (latestRefund ? readString(latestRefund.endToEndIdentifier) : undefined) ?? paymentId,
    refundAmount,
  };
}

export function isAsaasAlreadyRefundedError(payload: unknown): boolean {
  const text = [
    isRecord(payload) && Array.isArray(payload.errors)
      ? payload.errors
          .map((item) => (isRecord(item) ? readString(item.description) ?? readString(item.code) : undefined))
          .filter(Boolean)
          .join(" ")
      : "",
    isRecord(payload) ? readString(payload.message) ?? "" : "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    text.includes("already refunded") ||
    text.includes("payment already refunded") ||
    text.includes("já estornado") ||
    text.includes("ja estornado") ||
    text.includes("estornado anteriormente")
  );
}

export async function refundAsaasPayment(input: {
  paymentId: string;
  description?: string;
  value?: number;
}): Promise<AsaasRefundResult> {
  const body: Record<string, unknown> = {
    description: input.description ?? "Cancelamento da aula no Aprendiz Bay",
  };
  if (typeof input.value === "number" && Number.isFinite(input.value) && input.value > 0) {
    body.value = input.value;
  }

  let response: Response;
  try {
    response = await fetch(buildAsaasRefundUrl(input.paymentId), {
      method: "POST",
      headers: asaasRequestHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ASAAS_REFUND_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(
        "O estorno no Asaas excedeu o tempo limite. Nenhum cancelamento foi concluído. Tente novamente.",
      );
    }
    throw error;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isAsaasAlreadyRefundedError(payload)) {
      return {
        paymentId: input.paymentId,
        status: "REFUNDED",
        refundId: input.paymentId,
      };
    }
    throw new Error(
      asaasErrorMessage(
        payload,
        `Não foi possível estornar o pagamento no Asaas (${response.status}).`,
      ),
    );
  }

  return parseAsaasRefund(payload);
}

export async function findAsaasPaymentIdByExternalReference(
  externalReference: string,
): Promise<string | undefined> {
  const url = new URL(`${getAsaasApiBaseUrl()}/payments`);
  url.searchParams.set("externalReference", externalReference);

  const response = await fetch(url, {
    method: "GET",
    headers: asaasRequestHeaders(),
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload) || !Array.isArray(payload.data)) {
    return undefined;
  }

  const paid = payload.data.find((item) => {
    if (!isRecord(item)) {
      return false;
    }
    const status = readString(item.status);
    return status === "CONFIRMED" || status === "RECEIVED" || status === "RECEIVED_IN_CASH";
  });

  return isRecord(paid) ? readString(paid.id) : undefined;
}

export const ASAAS_CHECKOUT_MINUTES_TO_EXPIRE = 1440;

export const REUSABLE_ASAAS_CHECKOUT_STATUSES = new Set(["ACTIVE"]);
export const PAID_ASAAS_CHECKOUT_STATUSES = new Set(["PAID"]);
export const DEAD_ASAAS_CHECKOUT_STATUSES = new Set(["EXPIRED", "CANCELED", "CANCELLED"]);

export function parseAsaasCheckout(payload: unknown): AsaasCheckoutResult {
  if (!isRecord(payload)) {
    throw new Error("Resposta inválida do Asaas ao criar o checkout.");
  }

  const id = readString(payload.id);
  if (!id) {
    throw new Error("O Asaas não retornou o identificador do checkout.");
  }

  return {
    id,
    checkoutUrl: buildCheckoutUrl(id, readString(payload.link)),
    status: readString(payload.status),
  };
}

export async function inspectAsaasCheckout(
  checkoutId: string,
): Promise<AsaasCheckoutResult | null> {
  const response = await fetch(
    `${getAsaasApiBaseUrl()}/checkouts/${encodeURIComponent(checkoutId)}`,
    {
      method: "GET",
      headers: asaasRequestHeaders(),
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload: unknown = await response.json().catch(() => null);
  try {
    return parseAsaasCheckout(payload);
  } catch {
    return null;
  }
}

export function buildCheckoutUrl(checkoutId: string, link?: string): string {
  if (link) {
    return link;
  }
  return `${ASAAS_CHECKOUT_PAGE_URL}?id=${encodeURIComponent(checkoutId)}`;
}

function asaasErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload) || !Array.isArray(payload.errors)) {
    return fallback;
  }

  const descriptions = payload.errors
    .map((item) => (isRecord(item) ? readString(item.description) : undefined))
    .filter((item): item is string => Boolean(item));

  return descriptions[0] ?? fallback;
}

export async function createAsaasCheckout(
  input: CreateAsaasCheckoutInput,
): Promise<AsaasCheckoutResult> {
  const response = await fetch(`${getAsaasApiBaseUrl()}/checkouts`, {
    method: "POST",
    headers: asaasRequestHeaders(),
    body: JSON.stringify({
      billingTypes: ["PIX", "CREDIT_CARD"],
      chargeTypes: ["DETACHED"],
      minutesToExpire: input.minutesToExpire ?? ASAAS_CHECKOUT_MINUTES_TO_EXPIRE,
      externalReference: input.bookingId,
      callback: {
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        expiredUrl: input.expiredUrl ?? input.cancelUrl,
      },
      items: [
        {
          externalReference: input.bookingId,
          name: input.itemName.slice(0, 30),
          description: input.itemDescription?.slice(0, 150),
          quantity: 1,
          value: input.value,
          imageBase64: PLACEHOLDER_ITEM_IMAGE,
        },
      ],
      customerData: {
        name: input.customer.name,
        cpfCnpj: input.customer.cpfCnpj,
        email: input.customer.email,
        phone: input.customer.phone,
        address: input.customer.address,
        addressNumber: input.customer.addressNumber,
        postalCode: input.customer.postalCode,
        province: input.customer.province,
      },
    }),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      asaasErrorMessage(payload, `Asaas recusou a criação do checkout (${response.status}).`),
    );
  }

  return parseAsaasCheckout(payload);
}

export function isMalformedAsaasWebhookPayload(payload: unknown): boolean {
  return payload == null || typeof payload !== "object" || Array.isArray(payload);
}

export function resolveAsaasWebhookOutcome(input: {
  event: string;
  paymentStatus?: string;
  checkoutStatus?: string;
}): AsaasWebhookOutcome {
  const event = input.event.trim().toUpperCase();
  const paymentStatus = input.paymentStatus?.trim().toUpperCase();
  const checkoutStatus = input.checkoutStatus?.trim().toUpperCase();

  if (
    SUCCESSFUL_PAYMENT_EVENTS.has(event) ||
    paymentStatus === "CONFIRMED" ||
    paymentStatus === "RECEIVED" ||
    paymentStatus === "RECEIVED_IN_CASH" ||
    checkoutStatus === "PAID"
  ) {
    return "successful";
  }

  if (
    EXPIRED_CHECKOUT_EVENTS.has(event) ||
    checkoutStatus === "EXPIRED" ||
    checkoutStatus === "CANCELED" ||
    checkoutStatus === "CANCELLED"
  ) {
    return "expired";
  }

  if (FAILED_PAYMENT_EVENTS.has(event)) {
    return "failed";
  }

  return "ignored";
}

export function parseAsaasWebhook(payload: unknown): AsaasWebhookMatch {
  const body = isRecord(payload) ? payload : {};
  const payment = isRecord(body.payment) ? body.payment : {};
  const checkout = isRecord(body.checkout) ? body.checkout : {};
  const event = readString(body.event) ?? "";
  const outcome = resolveAsaasWebhookOutcome({
    event,
    paymentStatus: readString(payment.status),
    checkoutStatus: readString(checkout.status),
  });

  return {
    event,
    outcome,
    isSuccessfulPayment: outcome === "successful",
    bookingId:
      readString(payment.externalReference) ??
      readString(checkout.externalReference) ??
      readString(body.externalReference),
    paymentId: readString(payment.id),
    asaasCheckoutId:
      readString(payment.checkoutSession) ??
      readString(checkout.id) ??
      readString(body.checkoutSession),
  };
}

export interface AsaasWebhookAuthOptions {
  /**
   * Explicit expected token for tests. Production always uses
   * `ASAAS_WEBHOOK_TOKEN`. An empty injected value still fails closed.
   */
  expectedToken?: string;
}

export type AsaasWebhookAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

function readConfiguredWebhookToken(): string {
  return process.env.ASAAS_WEBHOOK_TOKEN?.trim() ?? "";
}

function resolveExpectedWebhookToken(options?: AsaasWebhookAuthOptions): string {
  if (options && Object.prototype.hasOwnProperty.call(options, "expectedToken")) {
    return options.expectedToken?.trim() ?? "";
  }
  return readConfiguredWebhookToken();
}

function webhookTokensMatch(provided: string, expected: string): boolean {
  const actual = Buffer.from(provided);
  const required = Buffer.from(expected);
  if (actual.length !== required.length) {
    timingSafeEqual(required, required);
    return false;
  }
  return timingSafeEqual(actual, required);
}

export function getAsaasWebhookToken(headers: Headers): string | undefined {
  return (
    headers.get("asaas-access-token") ??
    headers.get("asaas-access-token".toUpperCase()) ??
    headers.get("access_token") ??
    undefined
  )?.trim();
}

export function authorizeAsaasWebhook(
  headers: Headers,
  options?: AsaasWebhookAuthOptions,
): AsaasWebhookAuthResult {
  const expected = resolveExpectedWebhookToken(options);
  if (!expected) {
    return { ok: false, status: 503, error: WEBHOOK_UNCONFIGURED_MESSAGE };
  }

  const provided = getAsaasWebhookToken(headers);
  if (!provided || !webhookTokensMatch(provided, expected)) {
    return { ok: false, status: 401, error: WEBHOOK_UNAUTHORIZED_MESSAGE };
  }

  return { ok: true };
}

export function isAuthorizedAsaasWebhook(
  headers: Headers,
  options?: AsaasWebhookAuthOptions,
): boolean {
  return authorizeAsaasWebhook(headers, options).ok;
}
