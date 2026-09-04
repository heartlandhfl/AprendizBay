import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  WEBHOOK_UNAUTHORIZED_MESSAGE,
  WEBHOOK_UNCONFIGURED_MESSAGE,
} from "@/lib/payments/webhook-receipts";

const { mockVerifyWebhook, mockGetPaymentStatus, mockProcessPaymentWebhook } = vi.hoisted(
  () => ({
    mockVerifyWebhook: vi.fn(),
    mockGetPaymentStatus: vi.fn(),
    mockProcessPaymentWebhook: vi.fn(),
  }),
);

vi.mock("@/lib/payments/gateway/factory", () => ({
  createPaymentGateway: () => ({
    provider: "mercadopago",
    verifyWebhook: mockVerifyWebhook,
    getPaymentStatus: mockGetPaymentStatus,
  }),
}));

vi.mock("@/lib/payments/process-payment-webhook", () => ({
  buildVerifiedPaymentWebhookEvent: vi.fn((input) => ({
    provider: input.provider,
    eventId: `mercadopago_${input.paymentId}`,
    paymentId: input.paymentId,
    status: input.status,
    bookingId: input.bookingId,
    amount: input.amount,
  })),
  processPaymentWebhook: mockProcessPaymentWebhook,
}));

vi.mock("@/lib/observability/sentry-server", () => ({
  captureServerException: vi.fn(),
}));

import { POST, GET } from "@/app/api/mercadopago/webhook/route";

describe("POST /api/mercadopago/webhook", () => {
  beforeEach(() => {
    mockVerifyWebhook.mockReset();
    mockGetPaymentStatus.mockReset();
    mockProcessPaymentWebhook.mockReset();
  });

  it("rejects invalid webhook signatures", async () => {
    mockVerifyWebhook.mockResolvedValue({
      ok: false,
      httpStatus: 401,
      error: WEBHOOK_UNAUTHORIZED_MESSAGE,
    });

    const response = await POST(
      new Request("http://localhost/api/mercadopago/webhook?data.id=12345", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "payment", data: { id: "12345" } }),
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(payload.error).toBe(WEBHOOK_UNAUTHORIZED_MESSAGE);
    expect(mockGetPaymentStatus).not.toHaveBeenCalled();
  });

  it("re-fetches payment status and uses the canonical webhook processor", async () => {
    mockVerifyWebhook.mockResolvedValue({
      ok: true,
      event: {
        kind: "payment_update",
        status: "paid",
        paymentId: "12345",
        bookingId: "booking-123",
        paidAmount: 80,
      },
    });
    mockGetPaymentStatus.mockResolvedValue({
      paymentId: "12345",
      status: "paid",
      bookingId: "booking-123",
      amount: 80,
    });
    mockProcessPaymentWebhook.mockResolvedValue({
      kind: "paid",
      httpStatus: 200,
      received: true,
      confirmed: true,
      message: "Pagamento confirmado.",
    });

    const response = await POST(
      new Request("http://localhost/api/mercadopago/webhook?data.id=12345", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "payment", action: "payment.updated", data: { id: "12345" } }),
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.confirmed).toBe(true);
    expect(mockGetPaymentStatus).toHaveBeenCalledWith("12345");
    expect(mockProcessPaymentWebhook).toHaveBeenCalledTimes(1);
  });

  it("surfaces gateway configuration failures", async () => {
    mockVerifyWebhook.mockResolvedValue({
      ok: false,
      httpStatus: 503,
      error: WEBHOOK_UNCONFIGURED_MESSAGE,
    });

    const response = await POST(
      new Request("http://localhost/api/mercadopago/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(payload.error).toBe(WEBHOOK_UNCONFIGURED_MESSAGE);
  });
});

describe("GET /api/mercadopago/webhook", () => {
  beforeEach(() => {
    mockVerifyWebhook.mockReset();
    mockGetPaymentStatus.mockReset();
    mockProcessPaymentWebhook.mockReset();
  });

  it("returns a harmless health response without touching payment state", async () => {
    const response = await GET();
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(mockGetPaymentStatus).not.toHaveBeenCalled();
    expect(mockProcessPaymentWebhook).not.toHaveBeenCalled();
  });
});
