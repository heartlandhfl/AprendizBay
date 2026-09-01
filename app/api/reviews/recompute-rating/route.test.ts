import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRecomputeTutorRating, mockVerifyAdminIdToken } = vi.hoisted(() => ({
  mockRecomputeTutorRating: vi.fn(),
  mockVerifyAdminIdToken: vi.fn(),
}));

vi.mock("@/lib/reviews/server", () => ({
  recomputeTutorRating: mockRecomputeTutorRating,
}));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyAdminIdToken: mockVerifyAdminIdToken,
}));

import { POST } from "@/app/api/reviews/recompute-rating/route";

function jsonRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/reviews/recompute-rating", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reviews/recompute-rating", () => {
  beforeEach(() => {
    mockRecomputeTutorRating.mockReset();
    mockVerifyAdminIdToken.mockReset();
    mockRecomputeTutorRating.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lets an admin recalculate a tutor rating", async () => {
    mockVerifyAdminIdToken.mockResolvedValue("admin-1");

    const response = await POST(
      jsonRequest({ tutorId: "tutor-1" }, { authorization: "Bearer admin-token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockVerifyAdminIdToken).toHaveBeenCalledWith("admin-token");
    expect(mockRecomputeTutorRating).toHaveBeenCalledWith("tutor-1");
  });

  it("rejects an unauthenticated request before recomputing", async () => {
    mockVerifyAdminIdToken.mockRejectedValue(new Error("Token de autenticação ausente."));

    const response = await POST(jsonRequest({ tutorId: "tutor-1" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(String(payload.error)).toMatch(/Token|autenticação/i);
    expect(mockRecomputeTutorRating).not.toHaveBeenCalled();
  });

  it("rejects a signed-in student or tutor who supplies another tutorId", async () => {
    mockVerifyAdminIdToken.mockRejectedValue(new Error("Acesso restrito a administradores."));

    const response = await POST(
      jsonRequest({ tutorId: "tutor-1" }, { authorization: "Bearer student-token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Acesso restrito a administradores.");
    expect(mockRecomputeTutorRating).not.toHaveBeenCalled();
  });

  it("rejects an admin request without a tutor id", async () => {
    mockVerifyAdminIdToken.mockResolvedValue("admin-1");

    const response = await POST(jsonRequest({}, { authorization: "Bearer admin-token" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(String(payload.error)).toMatch(/professor/);
    expect(mockRecomputeTutorRating).not.toHaveBeenCalled();
  });
});
