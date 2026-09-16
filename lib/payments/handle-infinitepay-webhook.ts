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
    ...(result.kind === "amount_mismatch" ? { amountMismatch: true } : {}),
  };
}

/**
 * Canonical InfinitePay webhook handler.
 * Verifies payment via `/payment_check` before updating the booking.
 */
export async function handleInfinitePayWebhookRequest(
  request: Request,
  options: { logVerificationFailures?: boolean } = {},
): Promise<NextResponse> {
  try {
    const gateway = createPaymentGateway("infinitepay");
    const verification = await gateway.verifyWebhook(request);

    if (!verification.ok) {
      if (options.logVerificationFailures) {
        logCriticalServerFailure("webhook", "InfinitePay webhook verification failed", {
          provider: "infinitepay",
        });
        if (verification.httpStatus !== 400) {
          captureServerException(
            new Error(`Falha na verificação do webhook InfinitePay: ${verification.error}`),
          );
        }
      }
      return NextResponse.json({ error: verification.error }, { status: verification.httpStatus });
    }

    const event = verification.event;
    if (event.kind === "ignored" || !event.paymentId) {
      return NextResponse.json({ received: true, ignored: event.status });
    }

    const verifiedEvent = buildVerifiedPaymentWebhookEvent({
      provider: "infinitepay",
      paymentId: event.paymentId,
      status: event.status,
      bookingId: event.bookingId,
      amount: event.paidAmount,
      checkoutId: event.checkoutId,
    });

    const result = await processPaymentWebhook(verifiedEvent);

    if (result.kind === "amount_mismatch") {
      logCriticalServerFailure("payment", "Webhook amount mismatch", {
        provider: "infinitepay",
        paymentId: event.paymentId,
        bookingId: event.bookingId ?? null,
      });
    }

    return NextResponse.json(toWebhookJson(result));
  } catch (error) {
    logCriticalServerFailure("webhook", "InfinitePay webhook processing failed", {
      provider: "infinitepay",
    });
    captureServerException(error);
    const message =
      error instanceof Error ? error.message : "Não foi possível processar o webhook.";
    return NextResponse.json({ error: message }, { status: webhookErrorStatus(error) });
  }
}

export function infinitePayWebhookHealthResponse(): NextResponse {
  return NextResponse.json({ ok: true });
}
