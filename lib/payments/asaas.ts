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
  const refundAmount =
    latestRefund && typeof latestRefund.value === "number" && Number.isFinite(latestRefund.value)
      ? latestRefund.value
      : typeof payload.value === "number" && Number.isFinite(payload.value)
        ? payload.value
        : undefined;

  return {
    paymentId,
    status: readString(payload.status),
    refundId:
      (latestRefund ? readString(latestRefund.endToEndIdentifier) : undefined) ?? paymentId,
    refundAmount,
  };
}

export async function refundAsaasPayment(input: {
  paymentId: string;
  description?: string;
  value?: number;
}): Promise<AsaasRefundResult> {
  const body: Record<string, unknown> = {
    description: input.description ?? "Cancelamento da aula no Aprendiz Bay",
  };
  if (typeof input.value === "number" && Number.isFinite(input.value)) {
    body.value = input.value;
  }

  const response = await fetch(buildAsaasRefundUrl(input.paymentId), {
    method: "POST",
    headers: asaasRequestHeaders(),
    body: JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
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
      minutesToExpire: input.minutesToExpire ?? 1440,
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

export function parseAsaasWebhook(payload: unknown): AsaasWebhookMatch {
  const body = isRecord(payload) ? payload : {};
  const payment = isRecord(body.payment) ? body.payment : {};
  const checkout = isRecord(body.checkout) ? body.checkout : {};
  const event = readString(body.event) ?? "";

  return {
    event,
    isSuccessfulPayment:
      SUCCESSFUL_PAYMENT_EVENTS.has(event) ||
      readString(payment.status) === "CONFIRMED" ||
      readString(payment.status) === "RECEIVED" ||
      readString(checkout.status) === "PAID",
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

export function getAsaasWebhookToken(headers: Headers): string | undefined {
  return (
    headers.get("asaas-access-token") ??
    headers.get("asaas-access-token".toUpperCase()) ??
    headers.get("access_token") ??
    undefined
  )?.trim();
}

export function isAuthorizedAsaasWebhook(headers: Headers): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!expected) {
    return true;
  }
  return getAsaasWebhookToken(headers) === expected;
}
