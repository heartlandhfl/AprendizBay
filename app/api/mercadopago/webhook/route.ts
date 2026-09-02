import { NextResponse } from "next/server";
import { captureServerException } from "@/lib/observability/sentry-server";
import {
  authorizeMercadoPagoWebhook,
  extractMercadoPagoWebhookDataId,
  fetchMercadoPagoPayment,
  parseMercadoPagoWebhookNotification,
  resolveMercadoPagoPaymentOutcome,
} from "@/lib/payments/mercadopago";
import { processMercadoPagoPaymentWebhook } from "@/lib/payments/process-mercadopago-webhook";
import { WEBHOOK_INVALID_MESSAGE } from "@/lib/payments/webhook-receipts";

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
    const url = new URL(request.url);
    const queryDataId = url.searchParams.get("data.id");

    const auth = authorizeMercadoPagoWebhook(request.headers, queryDataId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: WEBHOOK_INVALID_MESSAGE }, { status: 400 });
    }

    const notification = parseMercadoPagoWebhookNotification(payload);
    const paymentId = extractMercadoPagoWebhookDataId(notification, queryDataId);

    if (!paymentId) {
      return NextResponse.json({ received: true, ignored: "missing_payment_id" });
    }

    const payment = await fetchMercadoPagoPayment(paymentId);
    const outcome = resolveMercadoPagoPaymentOutcome(payment.status);

    if (outcome === "ignored") {
      return NextResponse.json({ received: true, ignored: payment.status });
    }

    const result = await processMercadoPagoPaymentWebhook({
      paymentId,
      notificationId: notification.id,
      requestId: request.headers.get("x-request-id") ?? undefined,
      payment,
    });

    return NextResponse.json({
      received: result.received,
      message: result.message,
      ...(result.confirmed ? { confirmed: true } : {}),
      ...(result.alreadyProcessed ? { alreadyProcessed: true } : {}),
      ...(result.ignored ? { ignored: result.ignored } : {}),
      ...(result.kind === "rejected" ? { rejected: true } : {}),
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

export async function GET(request: Request) {
  return POST(request);
}
