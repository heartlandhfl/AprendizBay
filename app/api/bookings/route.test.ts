import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateIndividualBookingAsStudent, mockVerifyUserIdToken, mockGetUserProfile } =
  vi.hoisted(() => ({
    mockCreateIndividualBookingAsStudent: vi.fn(),
    mockVerifyUserIdToken: vi.fn(),
    mockGetUserProfile: vi.fn(),
  }));

vi.mock("@/lib/bookings/server", () => ({
  createIndividualBookingAsStudent: mockCreateIndividualBookingAsStudent,
}));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyUserIdToken: mockVerifyUserIdToken,
  getUserProfile: mockGetUserProfile,
  assertStudentApiActor: vi.fn(),
}));

import { POST } from "@/app/api/bookings/route";
import { CREATE_BOOKING_ERRORS } from "@/lib/bookings/create-booking";

function jsonRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/bookings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bookings", () => {
  beforeEach(() => {
    mockCreateIndividualBookingAsStudent.mockReset();
    mockVerifyUserIdToken.mockReset();
    mockGetUserProfile.mockReset();
    mockVerifyUserIdToken.mockResolvedValue({ uid: "student-1" });
    mockGetUserProfile.mockResolvedValue({ role: "student" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates from the authenticated uid", async () => {
    mockCreateIndividualBookingAsStudent.mockResolvedValue({
      bookingId: "booking-1",
      slotKey: "tutor-1_2026-09-08T19:00:00.000Z",
    });

    const response = await POST(
      jsonRequest(
        {
          tutorId: "tutor-1",
          type: "individual",
          scheduledAt: "2026-09-08T19:00:00.000Z",
          price: 70,
        },
        { authorization: "Bearer token" },
      ),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockCreateIndividualBookingAsStudent).toHaveBeenCalledWith({
      actorUid: "student-1",
      actorRole: "student",
      tutorId: "tutor-1",
      type: "individual",
      scheduledAt: "2026-09-08T19:00:00.000Z",
    });
  });

  it("rejects an unauthenticated request", async () => {
    mockVerifyUserIdToken.mockRejectedValue(new Error("Token de autenticação ausente."));

    const response = await POST(jsonRequest({ tutorId: "tutor-1" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(String(payload.error)).toMatch(/Token|autenticação/i);
    expect(mockCreateIndividualBookingAsStudent).not.toHaveBeenCalled();
  });

  it("returns the Portuguese slot-taken message on a race", async () => {
    const error = new Error(CREATE_BOOKING_ERRORS.SLOT_TAKEN);
    (error as Error & { code: string; httpStatus: number }).code = "SLOT_TAKEN";
    (error as Error & { code: string; httpStatus: number }).httpStatus = 409;
    mockCreateIndividualBookingAsStudent.mockRejectedValue(error);

    const response = await POST(
      jsonRequest(
        {
          tutorId: "tutor-1",
          type: "individual",
          scheduledAt: "2026-09-08T19:00:00.000Z",
          price: 70,
        },
        { authorization: "Bearer token" },
      ),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(payload.error).toBe(
      "Esse horário acabou de ser reservado por outro aluno. Escolha outro horário.",
    );
    expect(payload.code).toBe("SLOT_TAKEN");
  });
});
