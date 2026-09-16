import { logCriticalServerFailure } from "@/lib/observability/server-log";
import { centsToBrl } from "@/lib/payments/money";

const INFINITEPAY_API_BASE = "https://api.checkout.infinitepay.io";

export interface InfinitePayCheckoutItem {
  quantity: number;
  price: number;
  description: string;
}

export interface CreateInfinitePayLinkInput {
  orderNsu: string;
  items: InfinitePayCheckoutItem[];
  redirectUrl?: string;
  webhookUrl?: string;
  customer?: {
    name?: string;
    email?: string;
    phone_number?: string;
  };
}

export interface CreateInfinitePayLinkResult {
  checkoutUrl: string;
  slug?: string;
}

export interface InfinitePayPaymentCheckInput {
  orderNsu: string;
  transactionNsu: string;
  slug: string;
}

export interface InfinitePayPaymentCheckResult {
  success: boolean;
  paid: boolean;
  amount?: number;
  paidAmount?: number;
  installments?: number;
  captureMethod?: string;
}

export interface InfinitePayWebhookPayload {
  invoice_slug: string;
  amount: number;
  paid_amount: number;
  installments?: number;
  capture_method?: string;
  transaction_nsu: string;
  order_nsu: string;
  receipt_url?: string;
  items?: InfinitePayCheckoutItem[];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getInfinitePayHandle(): string {
  const raw = process.env.INFINITEPAY_HANDLE?.trim();
  if (!raw) {
    throw new Error("INFINITEPAY_HANDLE is not configured.");
  }
  return raw.replace(/^\$/, "");
}

export function getInfinitePayWebhookToken(): string | undefined {
  const token = process.env.INFINITEPAY_WEBHOOK_TOKEN?.trim();
  return token || undefined;
}

function infinitePayErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null) {
    const message = readString((payload as { message?: unknown }).message);
    if (message) {
      return message;
    }
  }
  return fallback;
}

async function postInfinitePayJson<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const response = await fetch(`${INFINITEPAY_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    logCriticalServerFailure("payment", "InfinitePay API request failed", {
      path,
      status: response.status,
    });
    return {
      ok: false,
      status: response.status,
      message: infinitePayErrorMessage(payload, `InfinitePay request failed (${response.status}).`),
    };
  }

  return { ok: true, data: payload as T };
}

export async function createInfinitePayCheckoutLink(
  input: CreateInfinitePayLinkInput,
): Promise<CreateInfinitePayLinkResult> {
  const handle = getInfinitePayHandle();

  const result = await postInfinitePayJson<{
    checkout_url?: string;
    link?: string;
    slug?: string;
  }>("/links", {
    handle,
    order_nsu: input.orderNsu,
    items: input.items,
    ...(input.redirectUrl ? { redirect_url: input.redirectUrl } : {}),
    ...(input.webhookUrl ? { webhook_url: input.webhookUrl } : {}),
    ...(input.customer ? { customer: input.customer } : {}),
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  const checkoutUrl =
    readString(result.data.checkout_url) ?? readString(result.data.link);
  if (!checkoutUrl) {
    throw new Error("A InfinitePay não retornou a URL do checkout.");
  }

  return {
    checkoutUrl,
    slug: readString(result.data.slug),
  };
}

export async function checkInfinitePayPayment(
  input: InfinitePayPaymentCheckInput,
): Promise<InfinitePayPaymentCheckResult | null> {
  const handle = getInfinitePayHandle();

  const result = await postInfinitePayJson<{
    success?: boolean;
    paid?: boolean;
    amount?: number;
    paid_amount?: number;
    installments?: number;
    capture_method?: string;
  }>("/payment_check", {
    handle,
    order_nsu: input.orderNsu,
    transaction_nsu: input.transactionNsu,
    slug: input.slug,
  });

  if (!result.ok) {
    if (result.status === 404) {
      return null;
    }
    throw new Error(result.message);
  }

  return {
    success: Boolean(result.data.success),
    paid: Boolean(result.data.paid),
    amount: readFiniteNumber(result.data.amount),
    paidAmount: readFiniteNumber(result.data.paid_amount),
    installments: readFiniteNumber(result.data.installments),
    captureMethod: readString(result.data.capture_method),
  };
}

export function parseInfinitePayWebhookPayload(body: unknown): InfinitePayWebhookPayload | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const record = body as Record<string, unknown>;
  const orderNsu = readString(record.order_nsu);
  const transactionNsu = readString(record.transaction_nsu);
  const invoiceSlug = readString(record.invoice_slug);
  const amount = readFiniteNumber(record.amount);
  const paidAmount = readFiniteNumber(record.paid_amount);

  if (!orderNsu || !transactionNsu || !invoiceSlug || amount == null || paidAmount == null) {
    return null;
  }

  return {
    invoice_slug: invoiceSlug,
    amount,
    paid_amount: paidAmount,
    installments: readFiniteNumber(record.installments),
    capture_method: readString(record.capture_method),
    transaction_nsu: transactionNsu,
    order_nsu: orderNsu,
    receipt_url: readString(record.receipt_url),
    items: Array.isArray(record.items)
      ? record.items
          .map((item) => {
            if (typeof item !== "object" || item === null) {
              return null;
            }
            const row = item as Record<string, unknown>;
            const quantity = readFiniteNumber(row.quantity);
            const price = readFiniteNumber(row.price);
            const description = readString(row.description);
            if (quantity == null || price == null || !description) {
              return null;
            }
            return { quantity, price, description };
          })
          .filter((item): item is InfinitePayCheckoutItem => item !== null)
      : undefined,
  };
}

export function infinitePayPaidAmountBrl(check: InfinitePayPaymentCheckResult): number | undefined {
  const cents = check.paidAmount ?? check.amount;
  if (cents == null) {
    return undefined;
  }
  return centsToBrl(cents) ?? undefined;
}

export function infinitePayWebhookPaidAmountBrl(payload: InfinitePayWebhookPayload): number {
  return centsToBrl(payload.paid_amount) ?? centsToBrl(payload.amount) ?? 0;
}

export function authorizeInfinitePayWebhook(request: Request): { ok: true } | { ok: false; error: string } {
  const expected = getInfinitePayWebhookToken();
  if (!expected) {
    return { ok: true };
  }

  const headerToken = request.headers.get("x-infinitepay-webhook-token")?.trim();
  const queryToken = new URL(request.url).searchParams.get("token")?.trim();
  const token = headerToken || queryToken;

  if (token !== expected) {
    return { ok: false, error: "Webhook InfinitePay não autorizado." };
  }

  return { ok: true };
}
