import type { EmailDeliveryStatus } from "@/lib/email/outbox/types";
import type { EmailOutboxStore } from "@/lib/email/outbox/store";
import type { ParsedJetSendWebhookEvent } from "@/lib/email/jetsend-webhook/parse";
import {
  EMAIL_DELIVERY_EVENTS_COLLECTION,
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_RECEIVED_MESSAGE,
  WEBHOOK_UNKNOWN_MESSAGE_MESSAGE,
} from "@/lib/email/jetsend-webhook/messages";

export interface EmailDeliveryEventRecord {
  providerEventId: string;
  providerMessageId: string;
  emailOutboxId?: string;
  deliveryStatus: EmailDeliveryStatus;
  occurredAt: Date;
  createdAt: Date;
}

export interface EmailDeliveryEventStore {
  get(providerEventId: string): Promise<EmailDeliveryEventRecord | null>;
  create(record: EmailDeliveryEventRecord): Promise<boolean>;
}

export interface ProcessJetSendWebhookResult {
  httpStatus: 200 | 404;
  received: true;
  message: string;
  alreadyProcessed?: boolean;
  ignored?: "unknown_message";
  processedCount?: number;
}

export interface ProcessJetSendWebhookDeps {
  outboxStore: EmailOutboxStore;
  deliveryEventStore: EmailDeliveryEventStore;
}

function buildDeliveryUpdate(event: ParsedJetSendWebhookEvent): {
  providerMessageId: string;
  deliveryStatus: EmailDeliveryStatus;
  providerEventId: string;
  deliveredAt?: Date;
  bouncedAt?: Date;
  complainedAt?: Date;
  deliveryFailedAt?: Date;
} {
  const base = {
    providerMessageId: event.providerMessageId,
    deliveryStatus: event.deliveryStatus,
    providerEventId: event.providerEventId,
  };

  switch (event.deliveryStatus) {
    case "delivered":
      return { ...base, deliveredAt: event.occurredAt };
    case "bounced":
      return { ...base, bouncedAt: event.occurredAt };
    case "complained":
      return { ...base, complainedAt: event.occurredAt };
    case "failed":
      return { ...base, deliveryFailedAt: event.occurredAt };
    default:
      return base;
  }
}

export async function processJetSendWebhookEvent(
  event: ParsedJetSendWebhookEvent,
  deps: ProcessJetSendWebhookDeps,
): Promise<ProcessJetSendWebhookResult> {
  const existing = await deps.deliveryEventStore.get(event.providerEventId);
  if (existing) {
    return {
      httpStatus: 200,
      received: true,
      alreadyProcessed: true,
      message: WEBHOOK_ALREADY_PROCESSED_MESSAGE,
    };
  }

  const emailOutboxId =
    event.emailOutboxId ??
    (await deps.outboxStore.findByProviderMessageId(event.providerMessageId))?.emailId;

  if (!emailOutboxId) {
    return {
      httpStatus: 404,
      received: true,
      ignored: "unknown_message",
      message: WEBHOOK_UNKNOWN_MESSAGE_MESSAGE,
    };
  }

  const created = await deps.deliveryEventStore.create({
    providerEventId: event.providerEventId,
    providerMessageId: event.providerMessageId,
    emailOutboxId,
    deliveryStatus: event.deliveryStatus,
    occurredAt: event.occurredAt,
    createdAt: new Date(),
  });

  if (!created) {
    return {
      httpStatus: 200,
      received: true,
      alreadyProcessed: true,
      message: WEBHOOK_ALREADY_PROCESSED_MESSAGE,
    };
  }

  await deps.outboxStore.updateDeliveryStatus(emailOutboxId, buildDeliveryUpdate(event));

  return {
    httpStatus: 200,
    received: true,
    message: WEBHOOK_RECEIVED_MESSAGE,
  };
}

export async function processJetSendWebhookEvents(
  events: ParsedJetSendWebhookEvent[],
  deps: ProcessJetSendWebhookDeps,
): Promise<ProcessJetSendWebhookResult> {
  let lastResult: ProcessJetSendWebhookResult = {
    httpStatus: 200,
    received: true,
    message: WEBHOOK_RECEIVED_MESSAGE,
    processedCount: 0,
  };

  for (const event of events) {
    const result = await processJetSendWebhookEvent(event, deps);
    lastResult = {
      ...result,
      processedCount: (lastResult.processedCount ?? 0) + (result.alreadyProcessed ? 0 : 1),
    };
  }

  return lastResult;
}

export function createMemoryEmailDeliveryEventStore(): EmailDeliveryEventStore & {
  records: Map<string, EmailDeliveryEventRecord>;
} {
  const records = new Map<string, EmailDeliveryEventRecord>();

  return {
    records,
    async get(providerEventId) {
      return records.get(providerEventId) ?? null;
    },
    async create(record) {
      if (records.has(record.providerEventId)) {
        return false;
      }
      records.set(record.providerEventId, record);
      return true;
    },
  };
}

export { EMAIL_DELIVERY_EVENTS_COLLECTION };
