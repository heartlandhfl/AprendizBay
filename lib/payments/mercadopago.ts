import { createHmac, timingSafeEqual } from "node:crypto";
import {
  WEBHOOK_UNAUTHORIZED_MESSAGE,
  WEBHOOK_UNCONFIGURED_MESSAGE,
} from "@/lib/payments/webhook-receipts";
import type { MercadoPagoPaymentStatus } from "@/lib/payments/mercadopago-webhook-receipts";

export const MERCADOPAGO_API_URL = "https://api.mercadopago.com";

export const APPROVED_MERCADOPAGO_STATUSES = new Set<MercadoPagoPaymentStatus>(["approved"]);

export const REJECTED_MERCADOPAGO_STATUSES = new Set<MercadoPagoPaymentStatus>(["rejected"]);

export const CANCELLED_MERCADOPAGO_STATUSES = new Set<MercadoPagoPaymentStatus>(["cancelled"]);

export const REFUNDED_MERCADOPAGO_STATUSES = new Set<MercadoPagoPaymentStatus>([
  "refunded",
  "charged_back",
]);

export const PENDING_MERCADOPAGO_STATUSES = new Set<MercadoPagoPaymentStatus>([
  "pending",
  "in_process",
  "authorized",
  "in_mediation",
]);

export interface MercadoPagoPayerIdentification {
  type?: string;
  number?: string;
}

export interface MercadoPagoPayer {
  email?: string;
  identification?: MercadoPagoPayerIdentification;
}

export interface CreateMercadoPagoPaymentInput {
  bookingId: string;
  transactionAmount: number;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string;
  payer: MercadoPagoPayer;
  description: string;
  notificationUrl?: string;
  idempotencyKey: string;
}

export interface MercadoPagoPaymentResult {
  id: string;
  status: MercadoPagoPaymentStatus;
  statusDetail?: string;
  externalReference?: string;
  transactionAmount?: number;
  currencyId?: string;
}

export interface MercadoPagoWebhookNotification {
  id?: string;
  type?: string;
  action?: string;
  data?: {
    id?: string;
  };
}

export interface MercadoPagoWebhookAuthOptions {
  expectedSecret?: string;
}

export type MercadoPagoWebhookAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured.");
  }
  return token;
}

export function getMercadoPagoPublicKey(): string {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() ?? "";
}

export function mercadopagoRequestHeaders(idempotencyKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
  };
  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey;
  }
  return headers;
}

export function parseMercadoPagoPaymentStatus(value: unknown): MercadoPagoPaymentStatus | undefined {
  const status = readString(value)?.toLowerCase();
  if (!status) {
    return undefined;
  }
  return status as MercadoPagoPaymentStatus;
}

export function parseMercadoPagoPayment(payload: unknown): MercadoPagoPaymentResult {
  if (!isRecord(payload)) {
    throw new Error("Resposta inválida do Mercado Pago ao consultar o pagamento.");
  }

  const id = readString(payload.id);
  if (!id) {
    throw new Error("O Mercado Pago não retornou o identificador do pagamento.");
  }

  const status = parseMercadoPagoPaymentStatus(payload.status);
  if (!status) {
    throw new Error("O Mercado Pago não retornou o status do pagamento.");
  }

  return {
    id,
    status,
    statusDetail: readString(payload.status_detail),
    externalReference: readString(payload.external_reference),
    transactionAmount:
      typeof payload.transaction_amount === "number" && Number.isFinite(payload.transaction_amount)
        ? payload.transaction_amount
        : undefined,
    currencyId: readString(payload.currency_id),
  };
}

function mercadopagoErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  const message = readString(payload.message);
  if (message) {
    return message;
  }

  if (Array.isArray(payload.cause)) {
    const descriptions = payload.cause
      .map((item) => (isRecord(item) ? readString(item.description) ?? readString(item.code) : undefined))
      .filter((item): item is string => Boolean(item));
    if (descriptions[0]) {
      return descriptions[0];
    }
  }

  return fallback;
}

export async function createMercadoPagoPayment(
  input: CreateMercadoPagoPaymentInput,
): Promise<MercadoPagoPaymentResult> {
  const body: Record<string, unknown> = {
    transaction_amount: input.transactionAmount,
    token: input.token,
    description: input.description,
    installments: input.installments,
    payment_method_id: input.paymentMethodId,
    external_reference: input.bookingId,
    payer: input.payer,
  };

  if (input.issuerId) {
    body.issuer_id = input.issuerId;
  }
  if (input.notificationUrl) {
    body.notification_url = input.notificationUrl;
  }

  const response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments`, {
    method: "POST",
    headers: mercadopagoRequestHeaders(input.idempotencyKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      mercadopagoErrorMessage(payload, `Mercado Pago recusou o pagamento (${response.status}).`),
    );
  }

  return parseMercadoPagoPayment(payload);
}

export async function fetchMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPaymentResult> {
  const response = await fetch(
    `${MERCADOPAGO_API_URL}/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: mercadopagoRequestHeaders(),
      signal: AbortSignal.timeout(20_000),
    },
  );

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      mercadopagoErrorMessage(payload, `Não foi possível consultar o pagamento (${response.status}).`),
    );
  }

  return parseMercadoPagoPayment(payload);
}

export function parseMercadoPagoWebhookNotification(payload: unknown): MercadoPagoWebhookNotification {
  if (!isRecord(payload)) {
    return {};
  }

  const data = isRecord(payload.data) ? payload.data : undefined;
  return {
    id: readString(payload.id),
    type: readString(payload.type),
    action: readString(payload.action),
    data: data ? { id: readString(data.id) } : undefined,
  };
}

export function extractMercadoPagoWebhookDataId(
  notification: MercadoPagoWebhookNotification,
  queryDataId?: string | null,
): string | undefined {
  return readString(queryDataId) ?? readString(notification.data?.id);
}

function readConfiguredWebhookSecret(): string {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() ?? "";
}

function resolveExpectedWebhookSecret(options?: MercadoPagoWebhookAuthOptions): string {
  if (options && Object.prototype.hasOwnProperty.call(options, "expectedSecret")) {
    return options.expectedSecret?.trim() ?? "";
  }
  return readConfiguredWebhookSecret();
}

function parseSignatureHeader(header: string | null): { ts?: string; v1?: string } {
  if (!header) {
    return {};
  }

  const parts: Record<string, string> = {};
  for (const segment of header.split(",")) {
    const [key, value] = segment.trim().split("=");
    if (key && value) {
      parts[key.trim()] = value.trim();
    }
  }

  return { ts: parts.ts, v1: parts.v1 };
}

export function buildMercadoPagoWebhookManifest(input: {
  dataId?: string | null;
  requestId?: string | null;
  ts?: string;
}): string {
  const parts: string[] = [];
  const dataId = readString(input.dataId ?? undefined);
  if (dataId) {
    parts.push(`id:${dataId.toLowerCase()}`);
  }
  const requestId = readString(input.requestId ?? undefined);
  if (requestId) {
    parts.push(`request-id:${requestId}`);
  }
  const ts = readString(input.ts);
  if (ts) {
    parts.push(`ts:${ts}`);
  }
  return `${parts.join(";")};`;
}

export function computeMercadoPagoWebhookSignature(
  manifest: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

function signaturesMatch(provided: string, expected: string): boolean {
  const actual = Buffer.from(provided);
  const required = Buffer.from(expected);
  if (actual.length !== required.length) {
    timingSafeEqual(required, required);
    return false;
  }
  return timingSafeEqual(actual, required);
}

export function verifyMercadoPagoWebhookSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId?: string | null;
  secret: string;
}): boolean {
  const { ts, v1 } = parseSignatureHeader(input.xSignature);
  if (!ts || !v1 || !input.secret) {
    return false;
  }

  const manifest = buildMercadoPagoWebhookManifest({
    dataId: input.dataId,
    requestId: input.xRequestId,
    ts,
  });
  const computed = computeMercadoPagoWebhookSignature(manifest, input.secret);
  return signaturesMatch(v1, computed);
}

export function authorizeMercadoPagoWebhook(
  headers: Headers,
  queryDataId: string | null,
  options?: MercadoPagoWebhookAuthOptions,
): MercadoPagoWebhookAuthResult {
  const expected = resolveExpectedWebhookSecret(options);
  if (!expected) {
    return { ok: false, status: 503, error: WEBHOOK_UNCONFIGURED_MESSAGE };
  }

  const ok = verifyMercadoPagoWebhookSignature({
    xSignature: headers.get("x-signature"),
    xRequestId: headers.get("x-request-id"),
    dataId: queryDataId,
    secret: expected,
  });

  if (!ok) {
    return { ok: false, status: 401, error: WEBHOOK_UNAUTHORIZED_MESSAGE };
  }

  return { ok: true };
}

export function resolveMercadoPagoPaymentOutcome(
  status: MercadoPagoPaymentStatus,
): "approved" | "rejected" | "cancelled" | "refunded" | "pending" | "ignored" {
  if (APPROVED_MERCADOPAGO_STATUSES.has(status)) {
    return "approved";
  }
  if (REJECTED_MERCADOPAGO_STATUSES.has(status)) {
    return "rejected";
  }
  if (CANCELLED_MERCADOPAGO_STATUSES.has(status)) {
    return "cancelled";
  }
  if (REFUNDED_MERCADOPAGO_STATUSES.has(status)) {
    return "refunded";
  }
  if (PENDING_MERCADOPAGO_STATUSES.has(status)) {
    return "pending";
  }
  return "ignored";
}
