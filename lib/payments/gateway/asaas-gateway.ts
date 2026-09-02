import {
  ASAAS_CHECKOUT_MINUTES_TO_EXPIRE,
  asaasRequestHeaders,
  authorizeAsaasWebhook,
  createAsaasCheckout,
  getAsaasApiBaseUrl,
  inspectAsaasCheckout,
  isMalformedAsaasWebhookPayload,
  parseAsaasWebhook,
  refundAsaasPayment,
  resolveAsaasWebhookOutcome,
  type AsaasWebhookOutcome,
} from "@/lib/payments/asaas";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentGateway,
  PaymentStatus,
  PaymentStatusResult,
  RefundInput,
  RefundResult,
  VerifyWebhookResult,
  WebhookEvent,
} from "@/lib/payments/gateway/types";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mapCheckoutRecordStatus(status: string | undefined): PaymentStatus {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "checkout_created";
    case "PAID":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "CANCELED":
    case "CANCELLED":
      return "cancelled";
    default:
      return "pending";
  }
}

function mapPaymentRecordStatus(status: string | undefined): PaymentStatus {
  switch (status?.toUpperCase()) {
    case "CONFIRMED":
    case "RECEIVED":
    case "RECEIVED_IN_CASH":
      return "paid";
    case "PENDING":
    case "AWAITING_RISK_ANALYSIS":
    case "REFUND_REQUESTED":
    case "REFUND_IN_PROGRESS":
      return "pending";
    case "REFUNDED":
      return "refunded";
    case "OVERDUE":
    case "DELETED":
      return "expired";
    case "RECEIVED_IN_CASH_UNDONE":
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
      return "failed";
    default:
      return "pending";
  }
}

function mapWebhookOutcome(outcome: AsaasWebhookOutcome): PaymentStatus {
  switch (outcome) {
    case "successful":
      return "paid";
    case "failed":
      return "failed";
    case "expired":
      return "expired";
    default:
      return "pending";
  }
}

function toWebhookEvent(
  outcome: AsaasWebhookOutcome,
  bookingId?: string,
  paymentId?: string,
  checkoutId?: string,
  paidAmount?: unknown,
): WebhookEvent {
  if (outcome === "ignored") {
    return { kind: "ignored", status: "pending" };
  }

  const amount =
    typeof paidAmount === "number" && Number.isFinite(paidAmount) ? paidAmount : undefined;

  return {
    kind: "payment_update",
    status: mapWebhookOutcome(outcome),
    bookingId,
    paymentId,
    checkoutId,
    paidAmount: amount,
  };
}

async function fetchAsaasPaymentRecord(paymentId: string): Promise<PaymentStatusResult | null> {
  const response = await fetch(
    `${getAsaasApiBaseUrl()}/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: asaasRequestHeaders(),
      signal: AbortSignal.timeout(20_000),
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!isRecord(payload)) {
    return null;
  }

  const id = readString(payload.id) ?? paymentId;
  return {
    paymentId: id,
    status: mapPaymentRecordStatus(readString(payload.status)),
    bookingId: readString(payload.externalReference),
    amount:
      typeof payload.value === "number" && Number.isFinite(payload.value)
        ? payload.value
        : undefined,
    checkoutId: readString(payload.checkoutSession),
  };
}

export class AsaasGateway implements PaymentGateway {
  readonly provider = "asaas" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const customer = input.customer;
    if (
      !customer.cpfCnpj ||
      !customer.phone ||
      !customer.address ||
      !customer.addressNumber ||
      !customer.postalCode ||
      !customer.province
    ) {
      throw new Error("Informe CPF, telefone e endereço completos para o checkout Asaas.");
    }

    const checkout = await createAsaasCheckout({
      bookingId: input.bookingId,
      itemName: input.itemName.slice(0, 30),
      itemDescription: input.itemDescription?.slice(0, 150),
      value: input.amount,
      customer: {
        name: customer.name,
        cpfCnpj: customer.cpfCnpj,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        addressNumber: customer.addressNumber,
        postalCode: customer.postalCode,
        province: customer.province,
      },
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      expiredUrl: input.expiredUrl ?? input.cancelUrl,
      minutesToExpire: input.minutesToExpire ?? ASAAS_CHECKOUT_MINUTES_TO_EXPIRE,
    });

    return {
      checkoutId: checkout.id,
      checkoutUrl: checkout.checkoutUrl,
      status: mapCheckoutRecordStatus(checkout.status),
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    const trimmed = paymentId.trim();
    if (!trimmed) {
      throw new Error("Informe o identificador do pagamento.");
    }

    const payment = await fetchAsaasPaymentRecord(trimmed);
    if (payment) {
      return payment;
    }

    const checkout = await inspectAsaasCheckout(trimmed);
    if (!checkout) {
      throw new Error("Pagamento não encontrado no Asaas.");
    }

    return {
      paymentId: checkout.id,
      checkoutId: checkout.id,
      status: mapCheckoutRecordStatus(checkout.status),
      bookingId: undefined,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const result = await refundAsaasPayment({
      paymentId: input.paymentId,
      description: input.description,
      value: input.amount,
    });

    return {
      paymentId: result.paymentId,
      status: "refunded",
      refundId: result.refundId,
      refundAmount: result.refundAmount,
    };
  }

  async verifyWebhook(request: Request): Promise<VerifyWebhookResult> {
    const auth = authorizeAsaasWebhook(request.headers);
    if (!auth.ok) {
      return { ok: false, httpStatus: auth.status, error: auth.error };
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return { ok: false, httpStatus: 401, error: "Corpo do webhook inválido." };
    }

    if (isMalformedAsaasWebhookPayload(payload)) {
      return { ok: false, httpStatus: 401, error: "Corpo do webhook inválido." };
    }

    const parsed = parseAsaasWebhook(payload);
    const outcome =
      parsed.outcome ??
      (parsed.isSuccessfulPayment ? "successful" : resolveAsaasWebhookOutcome({ event: parsed.event }));

    return {
      ok: true,
      event: toWebhookEvent(
        outcome,
        parsed.bookingId,
        parsed.paymentId,
        parsed.asaasCheckoutId,
        parsed.paidValue,
      ),
    };
  }
}

/** @internal Exported for unit tests that assert mapping tables stay stable. */
export const __asaasGatewayTestUtils = {
  mapCheckoutRecordStatus,
  mapPaymentRecordStatus,
  mapWebhookOutcome,
};
