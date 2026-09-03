import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import { createFirestoreEmailOutboxStore } from "@/lib/email/outbox/store";
import {
  authorizeJetSendWebhook,
  createFirestoreEmailDeliveryEventStore,
  parseJetSendWebhookPayload,
  processJetSendWebhookEvents,
  WEBHOOK_INVALID_MESSAGE,
} from "@/lib/email/jetsend-webhook";

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
    const auth = authorizeJetSendWebhook(request.headers);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: WEBHOOK_INVALID_MESSAGE }, { status: 400 });
    }

    const parsed = parseJetSendWebhookPayload(payload);
    if (parsed.malformed) {
      return NextResponse.json({ error: WEBHOOK_INVALID_MESSAGE }, { status: 400 });
    }

    if (parsed.ping) {
      return NextResponse.json({ received: true, ping: true });
    }

    const db = getFirestore(getAdminApp());
    const result = await processJetSendWebhookEvents(parsed.events, {
      outboxStore: createFirestoreEmailOutboxStore(db),
      deliveryEventStore: createFirestoreEmailDeliveryEventStore(db),
    });

    return NextResponse.json({
      received: result.received,
      message: result.message,
      ...(result.alreadyProcessed ? { alreadyProcessed: true } : {}),
      ...(result.ignored ? { ignored: result.ignored } : {}),
      ...(typeof result.processedCount === "number"
        ? { processedCount: result.processedCount }
        : {}),
    }, { status: result.httpStatus });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível processar o webhook.";
    return NextResponse.json({ error: message }, { status: webhookErrorStatus(error) });
  }
}
