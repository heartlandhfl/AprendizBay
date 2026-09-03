import type { EmailDeliveryStatus } from "@/lib/email/outbox/types";

export interface ParsedJetSendWebhookEvent {
  providerEventId: string;
  providerMessageId: string;
  emailOutboxId?: string;
  deliveryStatus: EmailDeliveryStatus;
  occurredAt: Date;
}

const FAILED_EVENT_TYPES = new Set([
  "rejection",
  "policy_rejection",
  "out_of_band",
  "generation_rejection",
  "generation_failure",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseTimestamp(value: unknown): Date | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000);
  }

  const asString = readString(value);
  if (!asString) {
    return undefined;
  }

  if (/^\d+$/.test(asString)) {
    return new Date(Number(asString) * 1000);
  }

  const parsed = new Date(asString);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function mapMessageEventType(type: string): EmailDeliveryStatus | null {
  switch (type) {
    case "delivery":
    case "delivered":
      return "delivered";
    case "bounce":
    case "bounced":
      return "bounced";
    case "spam_complaint":
    case "complaint":
    case "reported":
      return "complained";
    case "rejection":
    case "rejected":
    case "policy_rejection":
    case "out_of_band":
    case "generation_rejection":
    case "generation_failure":
    case "failed":
      return "failed";
    default:
      return FAILED_EVENT_TYPES.has(type) ? "failed" : null;
  }
}

function extractMessageEvent(
  envelope: Record<string, unknown>,
): Record<string, unknown> | null {
  const messageEvent = envelope.message_event;
  if (isRecord(messageEvent)) {
    return messageEvent;
  }

  return null;
}

function isPingBatchItem(item: unknown): boolean {
  if (!isRecord(item) || !isRecord(item.msys)) {
    return false;
  }

  const msys = item.msys;
  return Object.keys(msys).length === 0;
}

function parseMessageEvent(event: Record<string, unknown>): ParsedJetSendWebhookEvent | null {
  const type = readString(event.type);
  const providerEventId = readString(event.event_id);
  const providerMessageId = readString(event.message_id);

  if (!type || !providerEventId || !providerMessageId) {
    return null;
  }

  const deliveryStatus = mapMessageEventType(type);
  if (!deliveryStatus) {
    return null;
  }

  const rcptMeta = isRecord(event.rcpt_meta) ? event.rcpt_meta : undefined;
  const emailOutboxId =
    readString(rcptMeta?.emailOutboxId) ?? readString(rcptMeta?.email_outbox_id);

  return {
    providerEventId,
    providerMessageId,
    emailOutboxId,
    deliveryStatus,
    occurredAt: parseTimestamp(event.timestamp) ?? new Date(),
  };
}

/**
 * JetSend delivers SparkPost-compatible webhook batches (array of msys envelopes).
 * See SparkPost Event Webhooks API for payload fields such as event_id and message_id.
 */
export function parseJetSendWebhookPayload(payload: unknown): {
  events: ParsedJetSendWebhookEvent[];
  ping: boolean;
  malformed: boolean;
} {
  if (!Array.isArray(payload)) {
    return { events: [], ping: false, malformed: true };
  }

  if (payload.length === 0) {
    return { events: [], ping: false, malformed: true };
  }

  if (payload.every(isPingBatchItem)) {
    return { events: [], ping: true, malformed: false };
  }

  const events: ParsedJetSendWebhookEvent[] = [];

  for (const item of payload) {
    if (!isRecord(item) || !isRecord(item.msys)) {
      return { events: [], ping: false, malformed: true };
    }

    const messageEvent = extractMessageEvent(item.msys);
    if (!messageEvent) {
      continue;
    }

    const parsed = parseMessageEvent(messageEvent);
    if (parsed) {
      events.push(parsed);
    }
  }

  if (events.length === 0) {
    return { events: [], ping: false, malformed: true };
  }

  return { events, ping: false, malformed: false };
}
