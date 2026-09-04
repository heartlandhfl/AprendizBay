import { NextResponse } from "next/server";
import { logCriticalServerFailure } from "@/lib/observability/server-log";
import { captureServerException } from "@/lib/observability/sentry-server";
import { createPaymentGateway } from "@/lib/payments/gateway/factory";
import {
  buildVerifiedPaymentWebhookEvent,
  processPaymentWebhook,
} from "@/lib/payments/process-payment-webhook";

function webhookErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Firebase Admin")) {
    return 503;
  }
  return 400;
}

function toWebhookJson(result: Awaited<ReturnType<typeof processPaymentWebhook>>) {
  return {
    received: result.received,
    message: result.message,
    ...(result.confirmed ? { confirmed: true } : {}),
    ...(result.alreadyProcessed ? { alreadyProcessed: true } : {}),
    ...(result.ignored ? { ignored: result.ignored } : {}),
    ...(result.kind === "failed" ? { failed: true } : {}),
    ...(result.kind === "refunded" ? { refunded: true } : {}),
    ...(result.kind === "amount_mismatch" ? { amountMismatch: true } : {}),
  };
}

/**
 * Canonical Mercado Pago webhook handler.
 * Used by `/api/payments/webhook/mercadopago` (preferred) and
 * `/api/mercadopago/webhook` (legacy alias).
 */
export async function handleMercadoPagoWebhookRequest(
  request: Request,
  options: { logVerificationFailures?: boolean } = {},
): Promise<NextResponse> {
  try {
    const gateway = createPaymentGateway("mercadopago");
    const verification = await gateway.verifyWebhook(request);

    if (!verification.ok) {
      if (options.logVerificationFailures) {
        logCriticalServerFailure("webhook", "Mercado Pago webhook verification failed", {
          provider: "mercadopago",
        });
        captureServerException(
          new Error(`Falha na verificação do webhook Mercado Pago: ${verification.error}`),
        );
      }
      return NextResponse.json({ error: verification.error }, { status: verification.httpStatus });
    }

    const event = verification.event;
    if (event.kind === "ignored" || !event.paymentId) {
      return NextResponse.json({ received: true, ignored: event.status });
    }

    const payment = await gateway.getPaymentStatus(event.paymentId);
    const verifiedEvent = buildVerifiedPaymentWebhookEvent({
      provider: "mercadopago",
      paymentId: payment.paymentId,
      status: payment.status,
      bookingId: payment.bookingId ?? event.bookingId,
      amount: payment.amount ?? event.paidAmount,
      checkoutId: payment.checkoutId ?? event.checkoutId,
    });

    const result = await processPaymentWebhook(verifiedEvent);

    if (result.kind === "amount_mismatch") {
      logCriticalServerFailure("payment", "Webhook amount mismatch", {
        provider: "mercadopago",
        paymentId: payment.paymentId,
        bookingId: payment.bookingId ?? event.bookingId ?? null,
      });
    }

    return NextResponse.json(toWebhookJson(result));
  } catch (error) {
    logCriticalServerFailure("webhook", "Mercado Pago webhook processing failed", {
      provider: "mercadopago",
    });
    captureServerException(error);
    const message =
      error instanceof Error ? error.message : "Não foi possível processar o webhook.";
    return NextResponse.json({ error: message }, { status: webhookErrorStatus(error) });
  }
}

export function mercadoPagoWebhookHealthResponse(): NextResponse {
  return NextResponse.json({ ok: true });
}
