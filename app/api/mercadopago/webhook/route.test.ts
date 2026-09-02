import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WEBHOOK_UNAUTHORIZED_MESSAGE,
  WEBHOOK_UNCONFIGURED_MESSAGE,
} from "@/lib/payments/webhook-receipts";
import {
  buildMercadoPagoWebhookManifest,
  computeMercadoPagoWebhookSignature,
} from "@/lib/payments/mercadopago";

const { mockFetchPayment, mockProcessWebhook } = vi.hoisted(() => ({
  mockFetchPayment: vi.fn(),
  mockProcessWebhook: vi.fn(),
}));

vi.mock("@/lib/payments/mercadopago", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/mercadopago")>();
  return {
    ...actual,
    fetchMercadoPagoPayment: mockFetchPayment,
  };
});

vi.mock("@/lib/payments/process-mercadopago-webhook", () => ({
  processMercadoPagoPaymentWebhook: mockProcessWebhook,
}));

vi.mock("@/lib/observability/sentry-server", () => ({
  captureServerException: vi.fn(),
}));

import { POST } from "@/app/api/mercadopago/webhook/route";

const TEST_SECRET = "test-webhook-secret";

function signedRequest(body: unknown, dataId = "12345"): Request {
  const ts = "1704908010";
  const requestId = "req-123";
  const manifest = buildMercadoPagoWebhookManifest({ dataId, requestId, ts });
  const v1 = computeMercadoPagoWebhookSignature(manifest, TEST_SECRET);

  return new Request(`http://localhost/api/mercadopago/webhook?data.id=${dataId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": `ts=${ts},v1=${v1}`,
      "x-request-id": requestId,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/mercadopago/webhook", () => {
  const originalSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  beforeEach(() => {
    mockFetchPayment.mockReset();
    mockProcessWebhook.mockReset();
    process.env.MERCADOPAGO_WEBHOOK_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    } else {
      process.env.MERCADOPAGO_WEBHOOK_SECRET = originalSecret;
    }
  });

  it("rejects webhooks when the secret is missing", async () => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;

    const response = await POST(
      signedRequest({ type: "payment", data: { id: "12345" } }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(payload.error).toBe(WEBHOOK_UNCONFIGURED_MESSAGE);
    expect(mockFetchPayment).not.toHaveBeenCalled();
  });

  it("rejects invalid signatures", async () => {
    const response = await POST(
      new Request("http://localhost/api/mercadopago/webhook?data.id=12345", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-signature": "ts=1704908010,v1=deadbeef",
          "x-request-id": "req-123",
        },
        body: JSON.stringify({ type: "payment", data: { id: "12345" } }),
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(payload.error).toBe(WEBHOOK_UNAUTHORIZED_MESSAGE);
    expect(mockFetchPayment).not.toHaveBeenCalled();
  });

  it("fetches the payment from Mercado Pago before updating state", async () => {
    mockFetchPayment.mockResolvedValue({
      id: "12345",
      status: "approved",
      externalReference: "booking-123",
      transactionAmount: 80,
      currencyId: "BRL",
    });
    mockProcessWebhook.mockResolvedValue({
      kind: "approved",
      httpStatus: 200,
      received: true,
      confirmed: true,
      message: "Pagamento confirmado.",
    });

    const response = await POST(
      signedRequest({ type: "payment", action: "payment.updated", data: { id: "12345" } }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.confirmed).toBe(true);
    expect(mockFetchPayment).toHaveBeenCalledWith("12345");
    expect(mockProcessWebhook).toHaveBeenCalledTimes(1);
  });
});
