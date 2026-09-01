import { NextResponse } from "next/server";
import { captureServerException } from "@/lib/observability/sentry-server";
import {
  authorizeAsaasWebhook,
  isMalformedAsaasWebhookPayload,
  parseAsaasWebhook,
} from "@/lib/payments/asaas";
import { processAsaasPaymentWebhook } from "@/lib/payments/process-webhook";
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
    const auth = authorizeAsaasWebhook(request.headers);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: WEBHOOK_INVALID_MESSAGE }, { status: 400 });
    }

    if (isMalformedAsaasWebhookPayload(payload)) {
      return NextResponse.json({ error: WEBHOOK_INVALID_MESSAGE }, { status: 400 });
    }

    const event = parseAsaasWebhook(payload);

    if (event.outcome === "ignored") {
      return NextResponse.json({ received: true, ignored: event.event || "unknown" });
    }

    if (!event.bookingId) {
      return NextResponse.json({ received: true, ignored: "missing_external_reference" });
    }

    const result = await processAsaasPaymentWebhook(event);

    return NextResponse.json({
      received: result.received,
      message: result.message,
      ...(result.confirmed ? { confirmed: true } : {}),
      ...(result.alreadyProcessed ? { alreadyProcessed: true } : {}),
      ...(result.ignored ? { ignored: result.ignored } : {}),
      ...(result.kind === "failed" ? { failed: true } : {}),
      ...(result.kind === "expired" ? { expired: true } : {}),
    });
  } catch (error) {
    captureServerException(error);
    const message =
      error instanceof Error ? error.message : "Não foi possível processar o webhook.";
    return NextResponse.json({ error: message }, { status: webhookErrorStatus(error) });
  }
}
