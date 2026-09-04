import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockVerifyUserIdToken,
  mockGetUserProfile,
  mockRoleFromDecodedToken,
  mockGetTutorEarningsSummary,
  mockGetFirestore,
  mockGetAdminApp,
} = vi.hoisted(() => ({
  mockVerifyUserIdToken: vi.fn(),
  mockGetUserProfile: vi.fn(),
  mockRoleFromDecodedToken: vi.fn(),
  mockGetTutorEarningsSummary: vi.fn(),
  mockGetFirestore: vi.fn(),
  mockGetAdminApp: vi.fn(),
}));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyUserIdToken: mockVerifyUserIdToken,
  getUserProfile: mockGetUserProfile,
}));

vi.mock("@/lib/auth/role-server", () => ({
  roleFromDecodedToken: mockRoleFromDecodedToken,
}));

vi.mock("@/lib/tutors/earnings", () => ({
  getTutorEarningsSummary: mockGetTutorEarningsSummary,
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: mockGetFirestore,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminApp: mockGetAdminApp,
}));

import { GET } from "@/app/api/tutors/me/earnings/route";

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/tutors/me/earnings", {
    method: "GET",
    headers,
  });
}

describe("GET /api/tutors/me/earnings", () => {
  beforeEach(() => {
    mockVerifyUserIdToken.mockReset();
    mockGetUserProfile.mockReset();
    mockRoleFromDecodedToken.mockReset();
    mockGetTutorEarningsSummary.mockReset();
    mockGetFirestore.mockReset();
    mockGetAdminApp.mockReset();
    mockGetAdminApp.mockReturnValue({ name: "admin-app" });
    mockGetFirestore.mockReturnValue({ collection: vi.fn() });
    mockGetTutorEarningsSummary.mockResolvedValue({
      paidTotal: 80,
      pendingTotal: 20,
      processingTotal: 0,
      paidCount: 1,
      pendingCount: 1,
      processingCount: 0,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns owner-scoped earnings for a lecturer and never trusts a client tutor id", async () => {
    mockVerifyUserIdToken.mockResolvedValue({
      uid: "tutor-1",
      customClaims: { role: "lecturer" },
    });
    mockRoleFromDecodedToken.mockReturnValue("lecturer");
    mockGetUserProfile.mockResolvedValue({ role: "lecturer" });

    const response = await GET(
      request({
        authorization: "Bearer lecturer-token",
        "x-tutor-id": "attacker-tutor",
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockGetTutorEarningsSummary).toHaveBeenCalledWith(expect.anything(), "tutor-1");
    expect(mockGetTutorEarningsSummary.mock.calls[0]?.[1]).not.toBe("attacker-tutor");
  });

  it("denies a student", async () => {
    mockVerifyUserIdToken.mockResolvedValue({
      uid: "student-1",
      customClaims: { role: "student" },
    });
    mockRoleFromDecodedToken.mockReturnValue("student");
    mockGetUserProfile.mockResolvedValue({ role: "student" });

    const response = await GET(request({ authorization: "Bearer student-token" }));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(String(payload.error)).toMatch(/professores/i);
    expect(mockGetTutorEarningsSummary).not.toHaveBeenCalled();
  });

  it("rejects a missing token", async () => {
    mockVerifyUserIdToken.mockRejectedValue(new Error("Token de autenticação ausente."));

    const response = await GET(request());
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(String(payload.error)).toMatch(/Token|autenticação/i);
    expect(mockGetTutorEarningsSummary).not.toHaveBeenCalled();
  });
});
