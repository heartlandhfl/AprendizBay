import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateCollectiveBookingAsStudent, mockVerifyUserIdToken, mockGetUserProfile } =
  vi.hoisted(() => ({
    mockCreateCollectiveBookingAsStudent: vi.fn(),
    mockVerifyUserIdToken: vi.fn(),
    mockGetUserProfile: vi.fn(),
  }));

vi.mock("@/lib/bookings/server", () => ({
  createCollectiveBookingAsStudent: mockCreateCollectiveBookingAsStudent,
}));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyUserIdToken: mockVerifyUserIdToken,
  getUserProfile: mockGetUserProfile,
  assertStudentApiActor: vi.fn(),
}));

import { POST } from "@/app/api/hubs/join/route";
import { JOIN_AND_BOOK_ERRORS } from "@/lib/hubs/join-and-book";

function jsonRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/hubs/join", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/hubs/join", () => {
  beforeEach(() => {
    mockCreateCollectiveBookingAsStudent.mockReset();
    mockVerifyUserIdToken.mockReset();
    mockGetUserProfile.mockReset();
    mockVerifyUserIdToken.mockResolvedValue({ uid: "student-1" });
    mockGetUserProfile.mockResolvedValue({ role: "student" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("joins from the authenticated uid and ignores client financial fields", async () => {
    mockCreateCollectiveBookingAsStudent.mockResolvedValue({
      bookingId: "booking-1",
      hubId: "hub-1",
      price: 28,
    });

    const response = await POST(
      jsonRequest(
        {
          hubId: "hub-1",
          tutorId: "other-tutor",
          price: 1,
          platformFee: 0,
          tutorAmount: 1,
        },
        { authorization: "Bearer token" },
      ),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockCreateCollectiveBookingAsStudent).toHaveBeenCalledWith({
      actorUid: "student-1",
      actorRole: "student",
      hubId: "hub-1",
    });
  });

  it("rejects an unauthenticated request", async () => {
    mockVerifyUserIdToken.mockRejectedValue(new Error("Token de autenticação ausente."));

    const response = await POST(jsonRequest({ hubId: "hub-1" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(String(payload.error)).toMatch(/Token|autenticação/i);
    expect(mockCreateCollectiveBookingAsStudent).not.toHaveBeenCalled();
  });

  it("returns the Portuguese invalid-price message", async () => {
    const error = new Error(JOIN_AND_BOOK_ERRORS.INVALID_PRICE);
    (error as Error & { code: string; httpStatus: number }).code = "INVALID_PRICE";
    (error as Error & { code: string; httpStatus: number }).httpStatus = 409;
    mockCreateCollectiveBookingAsStudent.mockRejectedValue(error);

    const response = await POST(
      jsonRequest({ hubId: "hub-1" }, { authorization: "Bearer token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(payload.error).toBe("O valor desta turma não está disponível.");
  });
});
