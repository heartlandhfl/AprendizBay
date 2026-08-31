import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateStudentReview, mockVerifyUserIdToken } = vi.hoisted(() => ({
  mockCreateStudentReview: vi.fn(),
  mockVerifyUserIdToken: vi.fn(),
}));

vi.mock("@/lib/reviews/server", () => ({
  createStudentReview: mockCreateStudentReview,
}));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyUserIdToken: mockVerifyUserIdToken,
}));

import { POST } from "@/app/api/reviews/route";

function jsonRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/reviews", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reviews", () => {
  beforeEach(() => {
    mockCreateStudentReview.mockReset();
    mockVerifyUserIdToken.mockReset();
    mockVerifyUserIdToken.mockResolvedValue({ uid: "student-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a valid review from the authenticated uid", async () => {
    mockCreateStudentReview.mockResolvedValue({
      reviewId: "booking-1",
      tutorId: "tutor-1",
      bookingId: "booking-1",
    });

    const response = await POST(
      jsonRequest(
        {
          bookingId: "booking-1",
          tutorId: "tutor-1",
          rating: 5,
          comment: "Aula excelente.",
          studentId: "student-2",
        },
        { authorization: "Bearer token" },
      ),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.reviewId).toBe("booking-1");
    expect(mockCreateStudentReview).toHaveBeenCalledWith({
      actorUid: "student-1",
      bookingId: "booking-1",
      tutorId: "tutor-1",
      rating: 5,
      comment: "Aula excelente.",
    });
  });

  it("rejects an unauthenticated request", async () => {
    mockVerifyUserIdToken.mockRejectedValue(new Error("Token de autenticação ausente."));

    const response = await POST(jsonRequest({ bookingId: "booking-1" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(String(payload.error)).toMatch(/Token|autenticação/i);
    expect(mockCreateStudentReview).not.toHaveBeenCalled();
  });

  it("maps a duplicate review to 409", async () => {
    const error = new Error("Esta aula já foi avaliada.");
    (error as Error & { code: string; httpStatus: number }).code = "DUPLICATE_REVIEW";
    (error as Error & { code: string; httpStatus: number }).httpStatus = 409;
    mockCreateStudentReview.mockRejectedValue(error);

    const response = await POST(
      jsonRequest(
        { bookingId: "booking-1", tutorId: "tutor-1", rating: 5, comment: "Ok" },
        { authorization: "Bearer token" },
      ),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(payload.error).toBe("Esta aula já foi avaliada.");
  });
});
