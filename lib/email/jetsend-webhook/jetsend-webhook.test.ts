import { afterEach, describe, expect, it } from "vitest";
import {
  authorizeJetSendWebhook,
  buildJetSendBasicAuthorizationHeader,
} from "@/lib/email/jetsend-webhook/auth";
import {
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_UNAUTHORIZED_MESSAGE,
  WEBHOOK_UNCONFIGURED_MESSAGE,
} from "@/lib/email/jetsend-webhook/messages";
import { parseJetSendWebhookPayload } from "@/lib/email/jetsend-webhook/parse";
import {
  createMemoryEmailDeliveryEventStore,
  processJetSendWebhookEvent,
} from "@/lib/email/jetsend-webhook/process";
import { createMemoryEmailOutboxStore } from "@/lib/email/outbox/store";

const TEST_USERNAME = "jetsend-webhook-user";
const TEST_PASSWORD = "jetsend-webhook-password";

function buildMessageEvent(input: {
  type: string;
  eventId: string;
  messageId: string;
  emailOutboxId?: string;
  timestamp?: string;
}) {
  return [
    {
      msys: {
        message_event: {
          type: input.type,
          event_id: input.eventId,
          message_id: input.messageId,
          timestamp: input.timestamp ?? "1704825600",
          rcpt_to: "student@example.com",
          ...(input.emailOutboxId
            ? { rcpt_meta: { emailOutboxId: input.emailOutboxId } }
            : {}),
        },
      },
    },
  ];
}

function authHeaders(username = TEST_USERNAME, password = TEST_PASSWORD): Headers {
  return new Headers({
    authorization: buildJetSendBasicAuthorizationHeader(username, password),
  });
}

describe("authorizeJetSendWebhook", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("accepts valid Basic authentication credentials", () => {
    const result = authorizeJetSendWebhook(authHeaders(), {
      expectedUsername: TEST_USERNAME,
      expectedPassword: TEST_PASSWORD,
    });

    expect(result).toEqual({ ok: true });
  });

  it("rejects missing webhook configuration", () => {
    const result = authorizeJetSendWebhook(authHeaders(), {
      expectedUsername: "",
      expectedPassword: "",
    });

    expect(result).toEqual({
      ok: false,
      status: 503,
      error: WEBHOOK_UNCONFIGURED_MESSAGE,
    });
  });

  it("rejects invalid authentication credentials", () => {
    const result = authorizeJetSendWebhook(authHeaders("wrong", "credentials"), {
      expectedUsername: TEST_USERNAME,
      expectedPassword: TEST_PASSWORD,
    });

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: WEBHOOK_UNAUTHORIZED_MESSAGE,
    });
  });
});

describe("parseJetSendWebhookPayload", () => {
  it("parses delivery, bounce, complaint, and failure events", () => {
    const delivered = parseJetSendWebhookPayload(
      buildMessageEvent({
        type: "delivery",
        eventId: "evt-delivered",
        messageId: "msg-1",
      }),
    );
    const bounced = parseJetSendWebhookPayload(
      buildMessageEvent({
        type: "bounce",
        eventId: "evt-bounced",
        messageId: "msg-2",
      }),
    );
    const complained = parseJetSendWebhookPayload(
      buildMessageEvent({
        type: "spam_complaint",
        eventId: "evt-complaint",
        messageId: "msg-3",
      }),
    );
    const failed = parseJetSendWebhookPayload(
      buildMessageEvent({
        type: "policy_rejection",
        eventId: "evt-failed",
        messageId: "msg-4",
      }),
    );

    expect(delivered.events[0]?.deliveryStatus).toBe("delivered");
    expect(bounced.events[0]?.deliveryStatus).toBe("bounced");
    expect(complained.events[0]?.deliveryStatus).toBe("complained");
    expect(failed.events[0]?.deliveryStatus).toBe("failed");
  });

  it("accepts SparkPost webhook ping batches", () => {
    expect(parseJetSendWebhookPayload([{ msys: {} }])).toEqual({
      events: [],
      ping: true,
      malformed: false,
    });
  });

  it("rejects malformed payloads", () => {
    expect(parseJetSendWebhookPayload({ not: "an array" })).toEqual({
      events: [],
      ping: false,
      malformed: true,
    });
    expect(parseJetSendWebhookPayload([])).toEqual({
      events: [],
      ping: false,
      malformed: true,
    });
  });
});

describe("processJetSendWebhookEvent", () => {
  async function seedOutbox(providerMessageId?: string) {
    const outboxStore = createMemoryEmailOutboxStore();
    const enqueueResult = await outboxStore.enqueue({
      eventName: "BOOKING_ACCEPTED",
      eventKey: "BOOKING_ACCEPTED:booking-1:student-1",
      recipientEmail: "student@example.com",
      subject: "Sua aula foi confirmada",
      templateName: "BOOKING_ACCEPTED",
      text: "Texto",
      html: "<p>HTML</p>",
    });
    const emailId = enqueueResult.emailId;
    if (providerMessageId) {
      await outboxStore.markSent(emailId, {
        provider: "jetsend",
        providerMessageId,
      });
    }
    return { outboxStore, emailId };
  }

  it("updates delivery status for delivered events", async () => {
    const { outboxStore, emailId } = await seedOutbox("msg-delivered");
    const deliveryEventStore = createMemoryEmailDeliveryEventStore();

    const result = await processJetSendWebhookEvent(
      {
        providerEventId: "evt-delivered-1",
        providerMessageId: "msg-delivered",
        emailOutboxId: emailId,
        deliveryStatus: "delivered",
        occurredAt: new Date("2026-01-02T10:00:00.000Z"),
      },
      { outboxStore, deliveryEventStore },
    );

    const record = await outboxStore.get(emailId);
    expect(result.message).toBe("Evento recebido.");
    expect(record?.deliveryStatus).toBe("delivered");
    expect(record?.deliveredAt?.toISOString()).toBe("2026-01-02T10:00:00.000Z");
    expect(record?.providerEventId).toBe("evt-delivered-1");
  });

  it("updates delivery status for bounced events", async () => {
    const { outboxStore, emailId } = await seedOutbox("msg-bounced");
    const deliveryEventStore = createMemoryEmailDeliveryEventStore();

    await processJetSendWebhookEvent(
      {
        providerEventId: "evt-bounced-1",
        providerMessageId: "msg-bounced",
        emailOutboxId: emailId,
        deliveryStatus: "bounced",
        occurredAt: new Date("2026-01-02T11:00:00.000Z"),
      },
      { outboxStore, deliveryEventStore },
    );

    const record = await outboxStore.get(emailId);
    expect(record?.deliveryStatus).toBe("bounced");
    expect(record?.bouncedAt?.toISOString()).toBe("2026-01-02T11:00:00.000Z");
  });

  it("updates delivery status for complaint events", async () => {
    const { outboxStore, emailId } = await seedOutbox("msg-complaint");
    const deliveryEventStore = createMemoryEmailDeliveryEventStore();

    await processJetSendWebhookEvent(
      {
        providerEventId: "evt-complaint-1",
        providerMessageId: "msg-complaint",
        emailOutboxId: emailId,
        deliveryStatus: "complained",
        occurredAt: new Date("2026-01-02T12:00:00.000Z"),
      },
      { outboxStore, deliveryEventStore },
    );

    const record = await outboxStore.get(emailId);
    expect(record?.deliveryStatus).toBe("complained");
    expect(record?.complainedAt?.toISOString()).toBe("2026-01-02T12:00:00.000Z");
  });

  it("is idempotent for duplicate webhook deliveries", async () => {
    const { outboxStore, emailId } = await seedOutbox("msg-duplicate");
    const deliveryEventStore = createMemoryEmailDeliveryEventStore();
    const event = {
      providerEventId: "evt-duplicate-1",
      providerMessageId: "msg-duplicate",
      emailOutboxId: emailId,
      deliveryStatus: "delivered" as const,
      occurredAt: new Date("2026-01-02T10:00:00.000Z"),
    };

    const first = await processJetSendWebhookEvent(event, {
      outboxStore,
      deliveryEventStore,
    });
    const second = await processJetSendWebhookEvent(event, {
      outboxStore,
      deliveryEventStore,
    });

    expect(first.alreadyProcessed).toBeUndefined();
    expect(second).toMatchObject({
      alreadyProcessed: true,
      message: WEBHOOK_ALREADY_PROCESSED_MESSAGE,
    });
    expect(deliveryEventStore.records.size).toBe(1);
  });

  it("updates delivery status for failed events", async () => {
    const { outboxStore, emailId } = await seedOutbox("msg-failed");
    const deliveryEventStore = createMemoryEmailDeliveryEventStore();

    await processJetSendWebhookEvent(
      {
        providerEventId: "evt-failed-1",
        providerMessageId: "msg-failed",
        emailOutboxId: emailId,
        deliveryStatus: "failed",
        occurredAt: new Date("2026-01-02T13:00:00.000Z"),
      },
      { outboxStore, deliveryEventStore },
    );

    const record = await outboxStore.get(emailId);
    expect(record?.deliveryStatus).toBe("failed");
    expect(record?.deliveryFailedAt?.toISOString()).toBe("2026-01-02T13:00:00.000Z");
  });

  it("acknowledges unknown provider message IDs without exposing email content", async () => {
    const outboxStore = createMemoryEmailOutboxStore();
    const deliveryEventStore = createMemoryEmailDeliveryEventStore();

    const result = await processJetSendWebhookEvent(
      {
        providerEventId: "evt-unknown-1",
        providerMessageId: "msg-missing",
        deliveryStatus: "delivered",
        occurredAt: new Date(),
      },
      { outboxStore, deliveryEventStore },
    );

    expect(result.httpStatus).toBe(404);
    expect(result.ignored).toBe("unknown_message");
    expect(deliveryEventStore.records.size).toBe(0);
  });

  it("locates outbox records by providerMessageId when rcpt_meta is absent", async () => {
    const { outboxStore, emailId } = await seedOutbox("msg-lookup");
    const deliveryEventStore = createMemoryEmailDeliveryEventStore();

    await processJetSendWebhookEvent(
      {
        providerEventId: "evt-lookup-1",
        providerMessageId: "msg-lookup",
        deliveryStatus: "delivered",
        occurredAt: new Date("2026-01-02T10:00:00.000Z"),
      },
      { outboxStore, deliveryEventStore },
    );

    const record = await outboxStore.get(emailId);
    expect(record?.deliveryStatus).toBe("delivered");
  });
});
