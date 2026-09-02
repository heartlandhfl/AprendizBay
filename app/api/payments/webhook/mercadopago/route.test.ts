import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { POST } from "@/app/api/payments/webhook/mercadopago/route";

describe("POST /api/payments/webhook/mercadopago", () => {
  beforeEach(() => {
    mockVerifyWebhook.mockReset();
    mockGetPaymentStatus.mockReset();
    mockProcessPaymentWebhook.mockReset();
  });

  it("rejects invalid webhook signatures and logs to Sentry", async () => {
    mockVerifyWebhook.mockResolvedValue({
      ok: false,
      httpStatus: 401,
      error: "Webhook não autorizado.",
    });

    const response = await POST(
      new Request("http://localhost/api/payments/webhook/mercadopago", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockGetPaymentStatus).not.toHaveBeenCalled();
  });

  it("re-fetches payment status before processing", async () => {
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
      new Request("http://localhost/api/payments/webhook/mercadopago", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: { id: "12345" } }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockGetPaymentStatus).toHaveBeenCalledWith("12345");
    expect(mockProcessPaymentWebhook).toHaveBeenCalled();
  });
});
