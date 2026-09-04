import { NextResponse } from "next/server";
import { captureServerException } from "@/lib/observability/sentry-server";
import { createPaymentGateway } from "@/lib/payments/gateway/factory";
import {
  buildVerifiedPaymentWebhookEvent,
  processPaymentWebhook,
} from "@/lib/payments/process-payment-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function webhookErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Firebase Admin")) {
    return 503;
  }
  return 400;
}

export async function POST(request: Request) {
  try {
    const gateway = createPaymentGateway("mercadopago");
    const verification = await gateway.verifyWebhook(request);

    if (!verification.ok) {
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

    return NextResponse.json({
      received: result.received,
      message: result.message,
      ...(result.confirmed ? { confirmed: true } : {}),
      ...(result.alreadyProcessed ? { alreadyProcessed: true } : {}),
      ...(result.ignored ? { ignored: result.ignored } : {}),
      ...(result.kind === "failed" ? { failed: true } : {}),
      ...(result.kind === "refunded" ? { refunded: true } : {}),
      ...(result.kind === "amount_mismatch" ? { amountMismatch: true } : {}),
    });
  } catch (error) {
    captureServerException(error);
    const message =
      error instanceof Error ? error.message : "Não foi possível processar o webhook.";
    return NextResponse.json({ error: message }, { status: webhookErrorStatus(error) });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
