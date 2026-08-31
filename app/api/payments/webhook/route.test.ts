import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_BOOKING_NOT_FOUND_MESSAGE,
  WEBHOOK_CANCELLED_MESSAGE,
  WEBHOOK_CONFIRMED_MESSAGE,
  WEBHOOK_INVALID_MESSAGE,
  WEBHOOK_UNAUTHORIZED_MESSAGE,
} from "@/lib/payments/webhook-receipts";

const { mockProcessAsaasPaymentWebhook } = vi.hoisted(() => ({
  mockProcessAsaasPaymentWebhook: vi.fn(),
}));

vi.mock("@/lib/payments/process-webhook", () => ({
  processAsaasPaymentWebhook: mockProcessAsaasPaymentWebhook,
}));

vi.mock("@/lib/observability/sentry-server", () => ({
  captureServerException: vi.fn(),
}));

import { POST } from "@/app/api/payments/webhook/route";

const SUCCESS_BODY = {
  event: "PAYMENT_CONFIRMED",
  payment: {
    id: "pay_080225913252",
    status: "CONFIRMED",
    externalReference: "booking-123",
    checkoutSession: "checkout-abc",
  },
};

function jsonRequest(
  body: unknown,
  headers?: HeadersInit,
  raw?: string,
): Request {
  return new Request("http://localhost/api/payments/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: raw ?? JSON.stringify(body),
  });
}

describe("POST /api/payments/webhook", () => {
  const originalToken = process.env.ASAAS_WEBHOOK_TOKEN;

  beforeEach(() => {
    mockProcessAsaasPaymentWebhook.mockReset();
    delete process.env.ASAAS_WEBHOOK_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.ASAAS_WEBHOOK_TOKEN;
    } else {
      process.env.ASAAS_WEBHOOK_TOKEN = originalToken;
    }
  });

  it("confirms the first successful webhook without exposing payment ids", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "confirmed",
      httpStatus: 200,
      received: true,
      confirmed: true,
      message: WEBHOOK_CONFIRMED_MESSAGE,
    });

    const response = await POST(jsonRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.message).toBe(WEBHOOK_CONFIRMED_MESSAGE);
    expect(payload.confirmed).toBe(true);
    expect(payload).not.toHaveProperty("paymentId");
    expect(JSON.stringify(payload)).not.toContain("pay_080225913252");
    expect(mockProcessAsaasPaymentWebhook).toHaveBeenCalledTimes(1);
  });

  it("returns Evento já processado for a duplicate delivery", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "already_processed",
      httpStatus: 200,
      received: true,
      alreadyProcessed: true,
      message: WEBHOOK_ALREADY_PROCESSED_MESSAGE,
    });

    const response = await POST(jsonRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.message).toBe("Evento já processado.");
    expect(payload.alreadyProcessed).toBe(true);
  });

  it("returns Evento já processado for a replayed webhook", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "already_processed",
      httpStatus: 200,
      received: true,
      alreadyProcessed: true,
      message: WEBHOOK_ALREADY_PROCESSED_MESSAGE,
    });

    const replay = {
      event: "PAYMENT_RECEIVED",
      payment: {
        id: "pay_080225913252",
        status: "RECEIVED",
        externalReference: "booking-123",
      },
    };

    const response = await POST(jsonRequest(replay));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.message).toBe(WEBHOOK_ALREADY_PROCESSED_MESSAGE);
  });

  it("acknowledges a webhook for a nonexistent booking", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "booking_not_found",
      httpStatus: 200,
      received: true,
      ignored: "booking_not_found",
      message: WEBHOOK_BOOKING_NOT_FOUND_MESSAGE,
    });

    const response = await POST(jsonRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ignored).toBe("booking_not_found");
    expect(payload.message).toBe(WEBHOOK_BOOKING_NOT_FOUND_MESSAGE);
  });

  it("acknowledges a webhook for a cancelled booking", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "cancelled",
      httpStatus: 200,
      received: true,
      ignored: "cancelled",
      message: WEBHOOK_CANCELLED_MESSAGE,
    });

    const response = await POST(jsonRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ignored).toBe("cancelled");
    expect(payload.message).toBe(WEBHOOK_CANCELLED_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).toHaveBeenCalledTimes(1);
  });

  it("rejects an unauthorized webhook", async () => {
    process.env.ASAAS_WEBHOOK_TOKEN = "secret-token";

    const response = await POST(jsonRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(payload.error).toBe(WEBHOOK_UNAUTHORIZED_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
  });

  it("rejects a malformed webhook body", async () => {
    const response = await POST(jsonRequest(null, undefined, "{not-json"));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(payload.error).toBe(WEBHOOK_INVALID_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
  });

  it("rejects a non-object webhook payload", async () => {
    const response = await POST(jsonRequest(["PAYMENT_CONFIRMED"]));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(payload.error).toBe(WEBHOOK_INVALID_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
  });
});
