import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCompleteLessonAsActor, mockVerifyUserIdToken, mockGetUserProfile } = vi.hoisted(
  () => ({
    mockCompleteLessonAsActor: vi.fn(),
    mockVerifyUserIdToken: vi.fn(),
    mockGetUserProfile: vi.fn(),
  }),
);

vi.mock("@/lib/bookings/server", () => ({
  completeLessonAsActor: mockCompleteLessonAsActor,
}));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyUserIdToken: mockVerifyUserIdToken,
  getUserProfile: mockGetUserProfile,
}));

import { POST } from "@/app/api/bookings/complete/route";

function jsonRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/bookings/complete", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bookings/complete", () => {
  beforeEach(() => {
    mockCompleteLessonAsActor.mockReset();
    mockVerifyUserIdToken.mockReset();
    mockGetUserProfile.mockReset();
    mockVerifyUserIdToken.mockResolvedValue({ uid: "tutor-1" });
    mockGetUserProfile.mockResolvedValue({ role: "tutor" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("completes from the authenticated uid", async () => {
    mockCompleteLessonAsActor.mockResolvedValue({
      bookingId: "booking-1",
      status: "completed",
    });

    const response = await POST(
      jsonRequest({ bookingId: "booking-1" }, { authorization: "Bearer token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockCompleteLessonAsActor).toHaveBeenCalledWith({
      bookingId: "booking-1",
      actorUid: "tutor-1",
      actorClaimRole: undefined,
    });
  });

  it("rejects an unauthenticated request", async () => {
    mockVerifyUserIdToken.mockRejectedValue(new Error("Token de autenticação ausente."));

    const response = await POST(jsonRequest({ bookingId: "booking-1" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(String(payload.error)).toMatch(/Token|autenticação/i);
    expect(mockCompleteLessonAsActor).not.toHaveBeenCalled();
  });

  it("maps a forbidden student completion to 403", async () => {
    const error = new Error(
      "Apenas o professor desta aula ou um administrador pode marcá-la como concluída.",
    );
    (error as Error & { code: string; httpStatus: number }).code = "FORBIDDEN";
    (error as Error & { code: string; httpStatus: number }).httpStatus = 403;
    mockCompleteLessonAsActor.mockRejectedValue(error);

    const response = await POST(
      jsonRequest({ bookingId: "booking-1" }, { authorization: "Bearer token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(String(payload.error)).toMatch(/professor desta aula/);
  });
});
