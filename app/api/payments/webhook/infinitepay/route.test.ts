import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockVerifyWebhook, mockProcessPaymentWebhook } = vi.hoisted(() => ({
  mockVerifyWebhook: vi.fn(),
  mockProcessPaymentWebhook: vi.fn(),
}));

vi.mock("@/lib/payments/gateway/factory", () => ({
  createPaymentGateway: () => ({
    provider: "infinitepay",
    verifyWebhook: mockVerifyWebhook,
  }),
}));

vi.mock("@/lib/payments/process-payment-webhook", () => ({
  buildVerifiedPaymentWebhookEvent: vi.fn((input) => ({
    provider: input.provider,
    eventId: `infinitepay_${input.paymentId}`,
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

import { POST } from "@/app/api/payments/webhook/infinitepay/route";

describe("POST /api/payments/webhook/infinitepay", () => {
  beforeEach(() => {
    mockVerifyWebhook.mockReset();
    mockProcessPaymentWebhook.mockReset();
  });

  it("rejects unverified webhooks with 400 so InfinitePay retries", async () => {
    mockVerifyWebhook.mockResolvedValue({
      ok: false,
      httpStatus: 400,
      error: "Pagamento não confirmado pela InfinitePay.",
    });

    const response = await POST(
      new Request("http://localhost/api/payments/webhook/infinitepay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockProcessPaymentWebhook).not.toHaveBeenCalled();
  });

  it("confirms booking after verified webhook", async () => {
    mockVerifyWebhook.mockResolvedValue({
      ok: true,
      event: {
        kind: "payment_update",
        status: "paid",
        paymentId: "txn-uuid",
        bookingId: "booking-123",
        paidAmount: 80,
        checkoutId: "abc123",
      },
    });
    mockProcessPaymentWebhook.mockResolvedValue({
      kind: "paid",
      httpStatus: 200,
      received: true,
      confirmed: true,
      message: "Pagamento confirmado.",
    });

    const response = await POST(
      new Request("http://localhost/api/payments/webhook/infinitepay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoice_slug: "abc123",
          amount: 8000,
          paid_amount: 8000,
          transaction_nsu: "txn-uuid",
          order_nsu: "booking-123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockProcessPaymentWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "infinitepay",
        paymentId: "txn-uuid",
        bookingId: "booking-123",
      }),
    );
  });
});
