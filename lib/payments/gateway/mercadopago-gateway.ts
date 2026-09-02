import { MercadoPagoConfig, Payment, PaymentRefund, Preference } from "mercadopago";
import {
  authorizeMercadoPagoWebhook,
  extractMercadoPagoWebhookDataId,
  getMercadoPagoAccessToken,
  parseMercadoPagoWebhookNotification,
} from "@/lib/payments/mercadopago";
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

type MercadoPagoRawStatus = string;

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mapMercadoPagoStatus(raw: MercadoPagoRawStatus | undefined): PaymentStatus {
  switch (raw?.toLowerCase()) {
    case "approved":
      return "paid";
    case "pending":
    case "in_process":
    case "authorized":
    case "in_mediation":
      return "pending";
    case "rejected":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

function mapPreferenceLifecycle(raw: MercadoPagoRawStatus | undefined): PaymentStatus {
  switch (raw?.toLowerCase()) {
    case "closed":
      return "checkout_created";
    case "expired":
      return "expired";
    default:
      return "checkout_created";
  }
}

function resolveCheckoutUrl(initPoint?: string | null, sandboxInitPoint?: string | null): string {
  const url = readString(initPoint) ?? readString(sandboxInitPoint);
  if (!url) {
    throw new Error("O Mercado Pago não retornou a URL do checkout.");
  }
  return url;
}

function buildExpirationIso(minutesToExpire?: number): string | undefined {
  if (!minutesToExpire || minutesToExpire <= 0) {
    return undefined;
  }
  return new Date(Date.now() + minutesToExpire * 60_000).toISOString();
}

function toWebhookEventFromPayment(payment: {
  id?: string | number;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
}): WebhookEvent {
  const status = mapMercadoPagoStatus(readString(payment.status));
  if (status === "pending") {
    return { kind: "ignored", status };
  }

  return {
    kind: "payment_update",
    status,
    bookingId: readString(payment.external_reference),
    paymentId: payment.id != null ? String(payment.id) : undefined,
    paidAmount:
      typeof payment.transaction_amount === "number" &&
      Number.isFinite(payment.transaction_amount)
        ? payment.transaction_amount
        : undefined,
  };
}

export class MercadoPagoGateway implements PaymentGateway {
  readonly provider = "mercadopago" as const;

  private readonly config: MercadoPagoConfig;
  private readonly preferenceClient: Preference;
  private readonly paymentClient: Payment;
  private readonly refundClient: PaymentRefund;

  constructor(accessToken?: string) {
    this.config = new MercadoPagoConfig({
      accessToken: accessToken ?? getMercadoPagoAccessToken(),
      options: { timeout: 20_000 },
    });
    this.preferenceClient = new Preference(this.config);
    this.paymentClient = new Payment(this.config);
    this.refundClient = new PaymentRefund(this.config);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const cpf = input.customer.cpfCnpj?.replace(/\D/g, "");
    const expiration = buildExpirationIso(input.minutesToExpire);

    const preference = await this.preferenceClient.create({
      body: {
        external_reference: input.bookingId,
        items: [
          {
            id: input.bookingId,
            title: input.itemName.slice(0, 256),
            description: input.itemDescription?.slice(0, 256),
            quantity: 1,
            unit_price: input.amount,
            currency_id: "BRL",
          },
        ],
        payer: {
          name: input.customer.name,
          email: input.customer.email,
          ...(cpf
            ? {
                identification: {
                  type: "CPF",
                  number: cpf,
                },
              }
            : {}),
        },
        back_urls: {
          success: input.successUrl,
          failure: input.cancelUrl,
          pending: input.successUrl,
        },
        auto_return: "approved",
        ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
        ...(expiration
          ? {
              expires: true,
              expiration_date_to: expiration,
            }
          : {}),
        payment_methods: {
          installments: 12,
        },
        statement_descriptor: "APRENDIZ BAY",
      },
    });

    const checkoutId = readString(preference.id);
    if (!checkoutId) {
      throw new Error("O Mercado Pago não retornou o identificador do checkout.");
    }

    return {
      checkoutId,
      checkoutUrl: resolveCheckoutUrl(preference.init_point, preference.sandbox_init_point),
      status: "checkout_created",
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    const trimmed = paymentId.trim();
    if (!trimmed) {
      throw new Error("Informe o identificador do pagamento.");
    }

    const payment = await this.paymentClient.get({ id: trimmed });
    const id = payment.id != null ? String(payment.id) : trimmed;

    return {
      paymentId: id,
      status: mapMercadoPagoStatus(readString(payment.status)),
      bookingId: readString(payment.external_reference),
      amount:
        typeof payment.transaction_amount === "number" &&
        Number.isFinite(payment.transaction_amount)
          ? payment.transaction_amount
          : undefined,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const paymentId = input.paymentId.trim();
    if (!paymentId) {
      throw new Error("Informe o identificador do pagamento.");
    }

    const refund =
      typeof input.amount === "number" && Number.isFinite(input.amount) && input.amount > 0
        ? await this.refundClient.create({
            payment_id: paymentId,
            body: { amount: input.amount },
          })
        : await this.refundClient.total({ payment_id: paymentId });

    const refundId = refund.id != null ? String(refund.id) : paymentId;
    const refundAmount =
      typeof refund.amount === "number" && Number.isFinite(refund.amount)
        ? refund.amount
        : input.amount;

    return {
      paymentId,
      status: "refunded",
      refundId,
      refundAmount,
    };
  }

  async verifyWebhook(request: Request): Promise<VerifyWebhookResult> {
    const url = new URL(request.url);
    const queryDataId = url.searchParams.get("data.id");

    const auth = authorizeMercadoPagoWebhook(request.headers, queryDataId);
    if (!auth.ok) {
      return { ok: false, httpStatus: auth.status, error: auth.error };
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return { ok: false, httpStatus: 401, error: "Corpo do webhook inválido." };
    }

    const notification = parseMercadoPagoWebhookNotification(payload);
    const paymentId = extractMercadoPagoWebhookDataId(notification, queryDataId);
    if (!paymentId) {
      return { ok: true, event: { kind: "ignored", status: "pending" } };
    }

    const payment = await this.paymentClient.get({ id: paymentId });
    return { ok: true, event: toWebhookEventFromPayment(payment) };
  }
}

/** @internal Exported for unit tests that assert mapping tables stay stable. */
export const __mercadopagoGatewayTestUtils = {
  mapMercadoPagoStatus,
  mapPreferenceLifecycle,
};
