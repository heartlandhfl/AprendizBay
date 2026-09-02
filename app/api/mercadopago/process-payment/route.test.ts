import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROCESS_PAYMENT_ERRORS } from "@/lib/payments/process-mercadopago-payment";

const { mockVerifyUser, mockProcessPayment } = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockProcessPayment: vi.fn(),
}));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyUserIdToken: mockVerifyUser,
}));

vi.mock("@/lib/payments/process-mercadopago-payment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/process-mercadopago-payment")>();
  return {
    ...actual,
    processMercadoPagoBookingPayment: mockProcessPayment,
  };
});

vi.mock("@/lib/observability/sentry-server", () => ({
  captureServerException: vi.fn(),
}));

import { POST } from "@/app/api/mercadopago/process-payment/route";

function authorizedRequest(body: unknown): Request {
  return new Request("http://localhost/api/mercadopago/process-payment", {
    method: "POST",
    headers: {
      "content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/mercadopago/process-payment", () => {
  beforeEach(() => {
    mockVerifyUser.mockReset();
    mockProcessPayment.mockReset();
    mockVerifyUser.mockResolvedValue({ uid: "student-1" });
  });

  it("requires a booking id", async () => {
    const response = await POST(authorizedRequest({ token: "card-token" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Informe o identificador da reserva.");
  });

  it("returns only the payment status fields needed by the frontend", async () => {
    mockProcessPayment.mockResolvedValue({
      ok: true,
      paymentId: "12345",
      status: "pending",
      statusDetail: "pending_waiting_payment",
    });

    const response = await POST(
      authorizedRequest({
        bookingId: "booking-123",
        token: "card-token",
        paymentMethodId: "visa",
        installments: 1,
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      paymentId: "12345",
      status: "pending",
      statusDetail: "pending_waiting_payment",
    });
  });

  it("maps ownership failures to 403", async () => {
    mockProcessPayment.mockResolvedValue({
      ok: false,
      status: 403,
      error: PROCESS_PAYMENT_ERRORS.notOwner,
    });

    const response = await POST(
      authorizedRequest({
        bookingId: "booking-123",
        token: "card-token",
        paymentMethodId: "visa",
        installments: 1,
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(payload.error).toBe(PROCESS_PAYMENT_ERRORS.notOwner);
  });
});
