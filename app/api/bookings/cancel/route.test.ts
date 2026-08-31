import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CancelBookingError } from "@/lib/bookings/cancellation";

const { mockCancelBookingWithRefund, mockVerifyUserIdToken } = vi.hoisted(() => ({
  mockCancelBookingWithRefund: vi.fn(),
  mockVerifyUserIdToken: vi.fn(),
}));

vi.mock("@/lib/bookings/server", () => ({
  cancelBookingWithRefund: mockCancelBookingWithRefund,
}));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyUserIdToken: mockVerifyUserIdToken,
}));

import { POST } from "@/app/api/bookings/cancel/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/bookings/cancel", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer token",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bookings/cancel", () => {
  beforeEach(() => {
    mockCancelBookingWithRefund.mockReset();
    mockVerifyUserIdToken.mockReset();
    mockVerifyUserIdToken.mockResolvedValue({ uid: "student-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("ignores a client-supplied actor and authorizes from the authenticated uid", async () => {
    mockCancelBookingWithRefund.mockResolvedValue({
      bookingId: "booking-123",
      refunded: true,
      refundId: "E123",
    });

    const response = await POST(
      jsonRequest({ bookingId: "booking-123", actor: "tutor" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockCancelBookingWithRefund).toHaveBeenCalledWith({
      bookingId: "booking-123",
      actorUid: "student-1",
    });
    expect(mockCancelBookingWithRefund.mock.calls[0]?.[0]).not.toHaveProperty("actor");
  });

  it("does not require an actor field from the browser", async () => {
    mockCancelBookingWithRefund.mockResolvedValue({
      bookingId: "booking-123",
      refunded: false,
    });

    const response = await POST(jsonRequest({ bookingId: "booking-123" }));
    expect(response.status).toBe(200);
  });

  it("maps a forbidden cancellation to 403", async () => {
    mockCancelBookingWithRefund.mockRejectedValue(
      new CancelBookingError("forbidden", 403, "Você não pode cancelar esta reserva."),
    );

    const response = await POST(jsonRequest({ bookingId: "booking-123" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Você não pode cancelar esta reserva.");
  });

  it("maps an Asaas timeout to 504 without marking success", async () => {
    mockCancelBookingWithRefund.mockRejectedValue(
      new CancelBookingError(
        "refund_timeout",
        504,
        "O estorno no Asaas excedeu o tempo limite. Nenhum cancelamento foi concluído. Tente novamente.",
      ),
    );

    const response = await POST(jsonRequest({ bookingId: "booking-123" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(504);
    expect(String(payload.error)).toMatch(/tempo limite/);
  });
});
