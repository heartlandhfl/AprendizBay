import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_BOOKING_NOT_FOUND_MESSAGE,
  WEBHOOK_CANCELLED_MESSAGE,
  WEBHOOK_CONFIRMED_MESSAGE,
  WEBHOOK_EXPIRED_MESSAGE,
  WEBHOOK_FAILED_MESSAGE,
  WEBHOOK_INVALID_MESSAGE,
  WEBHOOK_UNAUTHORIZED_MESSAGE,
  WEBHOOK_AMOUNT_MISMATCH_MESSAGE,
  WEBHOOK_UNCONFIGURED_MESSAGE,
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

const TEST_WEBHOOK_TOKEN = "test-asaas-webhook-token";

const SUCCESS_BODY = {
  event: "PAYMENT_CONFIRMED",
  payment: {
    id: "pay_080225913252",
    status: "CONFIRMED",
    value: 70,
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

function authorizedRequest(
  body: unknown,
  headers?: HeadersInit,
  raw?: string,
): Request {
  return jsonRequest(
    body,
    {
      "asaas-access-token": TEST_WEBHOOK_TOKEN,
      ...headers,
    },
    raw,
  );
}

describe("POST /api/payments/webhook", () => {
  const originalToken = process.env.ASAAS_WEBHOOK_TOKEN;

  beforeEach(() => {
    mockProcessAsaasPaymentWebhook.mockReset();
    process.env.ASAAS_WEBHOOK_TOKEN = TEST_WEBHOOK_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.ASAAS_WEBHOOK_TOKEN;
    } else {
      process.env.ASAAS_WEBHOOK_TOKEN = originalToken;
    }
  });

  it("rejects a webhook when ASAAS_WEBHOOK_TOKEN is missing", async () => {
    delete process.env.ASAAS_WEBHOOK_TOKEN;

    const response = await POST(authorizedRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(payload.error).toBe(WEBHOOK_UNCONFIGURED_MESSAGE);
    expect(payload.error).not.toContain(TEST_WEBHOOK_TOKEN);
    expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
  });

  it("still rejects a missing token when NODE_ENV is test", async () => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.ASAAS_WEBHOOK_TOKEN;

    try {
      const response = await POST(authorizedRequest(SUCCESS_BODY));
      const payload = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(503);
      expect(payload.error).toBe(WEBHOOK_UNCONFIGURED_MESSAGE);
      expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("rejects a webhook when ASAAS_WEBHOOK_TOKEN is blank", async () => {
    process.env.ASAAS_WEBHOOK_TOKEN = "   ";

    const response = await POST(authorizedRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(payload.error).toBe(WEBHOOK_UNCONFIGURED_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
  });

  it("rejects an incorrect webhook token", async () => {
    const response = await POST(
      jsonRequest(SUCCESS_BODY, { "asaas-access-token": "wrong-token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(payload.error).toBe(WEBHOOK_UNAUTHORIZED_MESSAGE);
    expect(JSON.stringify(payload)).not.toContain(TEST_WEBHOOK_TOKEN);
    expect(JSON.stringify(payload)).not.toContain("wrong-token");
    expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
  });

  it("rejects a webhook that omits the access token header", async () => {
    const response = await POST(jsonRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(payload.error).toBe(WEBHOOK_UNAUTHORIZED_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
  });

  it("accepts a webhook with the correct token", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "confirmed",
      httpStatus: 200,
      received: true,
      confirmed: true,
      message: WEBHOOK_CONFIRMED_MESSAGE,
    });

    const response = await POST(authorizedRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.message).toBe(WEBHOOK_CONFIRMED_MESSAGE);
    expect(payload.confirmed).toBe(true);
    expect(payload).not.toHaveProperty("paymentId");
    expect(JSON.stringify(payload)).not.toContain("pay_080225913252");
    expect(mockProcessAsaasPaymentWebhook).toHaveBeenCalledTimes(1);
    expect(mockProcessAsaasPaymentWebhook.mock.calls[0]?.[0]).toMatchObject({
      paidValue: 70,
    });
  });

  it("returns the Portuguese amount-mismatch message without confirming", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "amount_mismatch",
      httpStatus: 200,
      received: true,
      amountMismatch: true,
      message: WEBHOOK_AMOUNT_MISMATCH_MESSAGE,
    });

    const response = await POST(authorizedRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.amountMismatch).toBe(true);
    expect(payload.confirmed).toBeUndefined();
    expect(payload.message).toBe("O valor do pagamento não confere com a reserva.");
  });

  it("returns Evento já processado for a duplicate delivery with the correct token", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "already_processed",
      httpStatus: 200,
      received: true,
      alreadyProcessed: true,
      message: WEBHOOK_ALREADY_PROCESSED_MESSAGE,
    });

    const response = await POST(authorizedRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.message).toBe("Evento já processado.");
    expect(payload.alreadyProcessed).toBe(true);
    expect(mockProcessAsaasPaymentWebhook).toHaveBeenCalledTimes(1);
  });

  it("returns Evento já processado for a replayed webhook with the correct token", async () => {
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

    const response = await POST(authorizedRequest(replay));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.message).toBe(WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).toHaveBeenCalledTimes(1);
  });

  it("confirms the first successful webhook without exposing payment ids", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "confirmed",
      httpStatus: 200,
      received: true,
      confirmed: true,
      message: WEBHOOK_CONFIRMED_MESSAGE,
    });

    const response = await POST(authorizedRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.message).toBe(WEBHOOK_CONFIRMED_MESSAGE);
    expect(payload.confirmed).toBe(true);
    expect(payload).not.toHaveProperty("paymentId");
    expect(JSON.stringify(payload)).not.toContain("pay_080225913252");
    expect(mockProcessAsaasPaymentWebhook).toHaveBeenCalledTimes(1);
  });

  it("acknowledges a webhook for a nonexistent booking", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "booking_not_found",
      httpStatus: 200,
      received: true,
      ignored: "booking_not_found",
      message: WEBHOOK_BOOKING_NOT_FOUND_MESSAGE,
    });

    const response = await POST(authorizedRequest(SUCCESS_BODY));
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

    const response = await POST(authorizedRequest(SUCCESS_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ignored).toBe("cancelled");
    expect(payload.message).toBe(WEBHOOK_CANCELLED_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed webhook body", async () => {
    const response = await POST(authorizedRequest(null, undefined, "{not-json"));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(payload.error).toBe(WEBHOOK_INVALID_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
  });

  it("rejects a non-object webhook payload", async () => {
    const response = await POST(authorizedRequest(["PAYMENT_CONFIRMED"]));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(payload.error).toBe(WEBHOOK_INVALID_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
  });

  it("processes a failed payment instead of ignoring it", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "failed",
      httpStatus: 200,
      received: true,
      message: WEBHOOK_FAILED_MESSAGE,
    });

    const response = await POST(
      authorizedRequest({
        event: "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
        payment: {
          id: "pay_refused",
          externalReference: "booking-123",
          checkoutSession: "checkout-abc",
        },
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.failed).toBe(true);
    expect(payload.message).toBe(WEBHOOK_FAILED_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).toHaveBeenCalledTimes(1);
    expect(mockProcessAsaasPaymentWebhook.mock.calls[0]?.[0]).toMatchObject({
      outcome: "failed",
      bookingId: "booking-123",
    });
  });

  it("processes an expired checkout instead of ignoring it", async () => {
    mockProcessAsaasPaymentWebhook.mockResolvedValue({
      kind: "expired",
      httpStatus: 200,
      received: true,
      message: WEBHOOK_EXPIRED_MESSAGE,
    });

    const response = await POST(
      authorizedRequest({
        event: "CHECKOUT_EXPIRED",
        checkout: {
          id: "checkout-abc",
          status: "EXPIRED",
          externalReference: "booking-123",
        },
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.expired).toBe(true);
    expect(payload.message).toBe(WEBHOOK_EXPIRED_MESSAGE);
    expect(mockProcessAsaasPaymentWebhook).toHaveBeenCalledTimes(1);
  });

  it("still ignores informational Asaas events", async () => {
    const response = await POST(
      authorizedRequest({ event: "PAYMENT_CREATED", payment: { id: "pay_1" } }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ignored).toBe("PAYMENT_CREATED");
    expect(mockProcessAsaasPaymentWebhook).not.toHaveBeenCalled();
  });
});
