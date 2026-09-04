import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockAcceptBookingAsTutor, mockVerifyUserIdToken } = vi.hoisted(() => ({
  mockAcceptBookingAsTutor: vi.fn(),
  mockVerifyUserIdToken: vi.fn(),
}));

vi.mock("@/lib/bookings/server", () => ({
  acceptBookingAsTutor: mockAcceptBookingAsTutor,
}));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyUserIdToken: mockVerifyUserIdToken,
}));

import { POST } from "@/app/api/bookings/accept/route";

function jsonRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/bookings/accept", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bookings/accept", () => {
  beforeEach(() => {
    mockAcceptBookingAsTutor.mockReset();
    mockVerifyUserIdToken.mockReset();
    mockVerifyUserIdToken.mockResolvedValue({ uid: "tutor-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("accepts from the authenticated tutor uid", async () => {
    mockAcceptBookingAsTutor.mockResolvedValue({
      bookingId: "booking-1",
      paymentStatus: "awaiting_payment",
    });

    const response = await POST(
      jsonRequest({ bookingId: "booking-1" }, { authorization: "Bearer token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.paymentStatus).toBe("awaiting_payment");
    expect(mockAcceptBookingAsTutor).toHaveBeenCalledWith({
      bookingId: "booking-1",
      actorUid: "tutor-1",
    });
  });

  it("rejects an unauthenticated request", async () => {
    mockVerifyUserIdToken.mockRejectedValue(new Error("Token de autenticação ausente."));

    const response = await POST(jsonRequest({ bookingId: "booking-1" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(String(payload.error)).toMatch(/Token|autenticação/i);
    expect(mockAcceptBookingAsTutor).not.toHaveBeenCalled();
  });

  it("maps a forbidden student acceptance to 403", async () => {
    mockAcceptBookingAsTutor.mockRejectedValue(
      new Error("Apenas o professor desta aula pode aceitar a solicitação."),
    );

    const response = await POST(
      jsonRequest({ bookingId: "booking-1" }, { authorization: "Bearer token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Apenas o professor desta aula pode aceitar a solicitação.");
  });
});
