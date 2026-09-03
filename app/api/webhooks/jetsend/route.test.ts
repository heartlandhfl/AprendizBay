import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildJetSendBasicAuthorizationHeader,
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_INVALID_MESSAGE,
  WEBHOOK_UNAUTHORIZED_MESSAGE,
  WEBHOOK_UNCONFIGURED_MESSAGE,
} from "@/lib/email/jetsend-webhook";

const TEST_USERNAME = "jetsend-webhook-user";
const TEST_PASSWORD = "jetsend-webhook-password";

const processMock = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminApp: vi.fn(() => ({})),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
}));

vi.mock("@/lib/email/outbox/store", () => ({
  createFirestoreEmailOutboxStore: vi.fn(() => ({})),
}));

vi.mock("@/lib/email/jetsend-webhook/firestore", () => ({
  createFirestoreEmailDeliveryEventStore: vi.fn(() => ({})),
}));

vi.mock("@/lib/email/jetsend-webhook/process", async () => {
  const actual = await vi.importActual<typeof import("@/lib/email/jetsend-webhook/process")>(
    "@/lib/email/jetsend-webhook/process",
  );
  return {
    ...actual,
    processJetSendWebhookEvents: (...args: unknown[]) => processMock(...args),
  };
});

import { POST } from "@/app/api/webhooks/jetsend/route";

function buildMessageEvent(input: {
  type: string;
  eventId: string;
  messageId: string;
  emailOutboxId?: string;
}) {
  return [
    {
      msys: {
        message_event: {
          type: input.type,
          event_id: input.eventId,
          message_id: input.messageId,
          timestamp: "1704825600",
          rcpt_to: "student@example.com",
          ...(input.emailOutboxId
            ? { rcpt_meta: { emailOutboxId: input.emailOutboxId } }
            : {}),
        },
      },
    },
  ];
}

function createRequest(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/webhooks/jetsend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: buildJetSendBasicAuthorizationHeader(TEST_USERNAME, TEST_PASSWORD),
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/jetsend", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JETSEND_WEBHOOK_USERNAME: TEST_USERNAME,
      JETSEND_WEBHOOK_PASSWORD: TEST_PASSWORD,
    };
    processMock.mockReset();
    processMock.mockResolvedValue({
      httpStatus: 200,
      received: true,
      message: "Evento recebido.",
      processedCount: 1,
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects webhooks when credentials are not configured", async () => {
    delete process.env.JETSEND_WEBHOOK_USERNAME;
    delete process.env.JETSEND_WEBHOOK_PASSWORD;

    const response = await POST(
      createRequest(
        buildMessageEvent({
          type: "delivery",
          eventId: "evt-1",
          messageId: "msg-1",
        }),
      ),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: WEBHOOK_UNCONFIGURED_MESSAGE });
  });

  it("rejects invalid authentication credentials", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhooks/jetsend", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: buildJetSendBasicAuthorizationHeader("wrong", "credentials"),
        },
        body: JSON.stringify(
          buildMessageEvent({
            type: "delivery",
            eventId: "evt-1",
            messageId: "msg-1",
          }),
        ),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: WEBHOOK_UNAUTHORIZED_MESSAGE });
  });

  it("rejects malformed payloads", async () => {
    const response = await POST(createRequest({ invalid: true }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: WEBHOOK_INVALID_MESSAGE });
  });

  it("processes delivered events", async () => {
    const payload = buildMessageEvent({
      type: "delivery",
      eventId: "evt-delivered",
      messageId: "msg-delivered",
      emailOutboxId: "outbox-1",
    });

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);
    expect(processMock).toHaveBeenCalledTimes(1);
    expect(processMock.mock.calls[0]?.[0]?.[0]).toMatchObject({
      providerEventId: "evt-delivered",
      providerMessageId: "msg-delivered",
      deliveryStatus: "delivered",
    });
  });

  it("processes bounced events", async () => {
    const response = await POST(
      createRequest(
        buildMessageEvent({
          type: "bounce",
          eventId: "evt-bounced",
          messageId: "msg-bounced",
          emailOutboxId: "outbox-2",
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(processMock.mock.calls[0]?.[0]?.[0]?.deliveryStatus).toBe("bounced");
  });

  it("processes complaint events", async () => {
    const response = await POST(
      createRequest(
        buildMessageEvent({
          type: "spam_complaint",
          eventId: "evt-complaint",
          messageId: "msg-complaint",
          emailOutboxId: "outbox-3",
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(processMock.mock.calls[0]?.[0]?.[0]?.deliveryStatus).toBe("complained");
  });

  it("returns success for already-processed events", async () => {
    processMock.mockResolvedValue({
      httpStatus: 200,
      received: true,
      alreadyProcessed: true,
      message: WEBHOOK_ALREADY_PROCESSED_MESSAGE,
    });

    const response = await POST(
      createRequest(
        buildMessageEvent({
          type: "delivery",
          eventId: "evt-duplicate",
          messageId: "msg-duplicate",
          emailOutboxId: "outbox-4",
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      alreadyProcessed: true,
      message: WEBHOOK_ALREADY_PROCESSED_MESSAGE,
    });
  });

  it("acknowledges unknown message IDs with a 404 response", async () => {
    processMock.mockResolvedValue({
      httpStatus: 404,
      received: true,
      ignored: "unknown_message",
      message: "Mensagem não encontrada no outbox.",
    });

    const response = await POST(
      createRequest(
        buildMessageEvent({
          type: "delivery",
          eventId: "evt-unknown",
          messageId: "msg-unknown",
        }),
      ),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ ignored: "unknown_message" });
  });
});
