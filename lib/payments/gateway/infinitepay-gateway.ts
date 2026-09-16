import {
  authorizeInfinitePayWebhook,
  checkInfinitePayPayment,
  createInfinitePayCheckoutLink,
  getInfinitePayHandle,
  infinitePayPaidAmountBrl,
  infinitePayWebhookPaidAmountBrl,
  parseInfinitePayWebhookPayload,
} from "@/lib/payments/infinitepay";
import { brlToCents } from "@/lib/payments/money";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentGateway,
  PaymentStatusResult,
  RefundInput,
  RefundResult,
  VerifyWebhookResult,
} from "@/lib/payments/gateway/types";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export class InfinitePayGateway implements PaymentGateway {
  readonly provider = "infinitepay" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    getInfinitePayHandle();

    const amountCents = brlToCents(input.amount);
    if (amountCents == null || amountCents <= 0) {
      throw new Error("O valor da reserva é inválido.");
    }

    const phone = input.customer.phone?.replace(/\D/g, "");
    const link = await createInfinitePayCheckoutLink({
      orderNsu: input.bookingId,
      items: [
        {
          quantity: 1,
          price: amountCents,
          description: input.itemDescription?.slice(0, 256) ?? input.itemName.slice(0, 256),
        },
      ],
      redirectUrl: input.successUrl,
      webhookUrl: input.notificationUrl,
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        ...(phone ? { phone_number: phone.startsWith("+") ? phone : `+55${phone}` } : {}),
      },
    });

    const checkoutId = link.slug ?? input.bookingId;

    return {
      checkoutId,
      checkoutUrl: link.checkoutUrl,
      status: "checkout_created",
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    throw new Error(
      "InfinitePay exige order_nsu, transaction_nsu e slug para consultar pagamentos. Use o webhook com payment_check.",
    );
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new Error(
      "Estornos automáticos não estão disponíveis pela API de checkout da InfinitePay.",
    );
  }

  async verifyWebhook(request: Request): Promise<VerifyWebhookResult> {
    const auth = authorizeInfinitePayWebhook(request);
    if (!auth.ok) {
      return { ok: false, httpStatus: 401, error: auth.error };
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return { ok: false, httpStatus: 400, error: "Corpo do webhook inválido." };
    }

    const event = parseInfinitePayWebhookPayload(payload);
    if (!event) {
      return { ok: true, event: { kind: "ignored", status: "pending" } };
    }

    const check = await checkInfinitePayPayment({
      orderNsu: event.order_nsu,
      transactionNsu: event.transaction_nsu,
      slug: event.invoice_slug,
    });

    if (!check?.success || !check.paid) {
      return {
        ok: false,
        httpStatus: 400,
        error: "Pagamento não confirmado pela InfinitePay.",
      };
    }

    const paidAmount = infinitePayPaidAmountBrl(check) ?? infinitePayWebhookPaidAmountBrl(event);

    return {
      ok: true,
      event: {
        kind: "payment_update",
        status: "paid",
        bookingId: event.order_nsu,
        paymentId: event.transaction_nsu,
        checkoutId: event.invoice_slug,
        paidAmount,
      },
    };
  }
}

/** @internal Exported for unit tests. */
export const __infinitepayGatewayTestUtils = {
  readString,
};
