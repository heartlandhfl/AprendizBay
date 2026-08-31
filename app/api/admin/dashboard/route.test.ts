import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockVerifyAdminIdToken, mockBuildDashboard, mockGetFirestore, mockGetAdminApp } =
  vi.hoisted(() => ({
    mockVerifyAdminIdToken: vi.fn(),
    mockBuildDashboard: vi.fn(),
    mockGetFirestore: vi.fn(),
    mockGetAdminApp: vi.fn(),
  }));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyAdminIdToken: mockVerifyAdminIdToken,
}));

vi.mock("@/lib/admin/dashboard", () => ({
  buildAdminOperationsDashboard: mockBuildDashboard,
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: mockGetFirestore,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminApp: mockGetAdminApp,
}));

import { GET } from "@/app/api/admin/dashboard/route";

function dashboardRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/admin/dashboard", {
    method: "GET",
    headers,
  });
}

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    mockVerifyAdminIdToken.mockReset();
    mockBuildDashboard.mockReset();
    mockGetFirestore.mockReset();
    mockGetAdminApp.mockReset();
    mockGetAdminApp.mockReturnValue({ name: "admin-app" });
    mockGetFirestore.mockReturnValue({ collection: vi.fn() });
    mockBuildDashboard.mockResolvedValue({
      generatedAt: "2026-08-31T00:00:00.000Z",
      overview: { students: { available: true, value: 2 } },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the dashboard only after admin authorization", async () => {
    mockVerifyAdminIdToken.mockResolvedValue("admin-1");

    const response = await GET(
      dashboardRequest({ authorization: "Bearer admin-token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockVerifyAdminIdToken).toHaveBeenCalledWith("admin-token");
    expect(mockBuildDashboard).toHaveBeenCalledTimes(1);
    expect(payload.dashboard).toEqual({
      generatedAt: "2026-08-31T00:00:00.000Z",
      overview: { students: { available: true, value: 2 } },
    });
  });

  it("rejects an unauthenticated request before loading Firebase data", async () => {
    mockVerifyAdminIdToken.mockRejectedValue(new Error("Token de autenticação ausente."));

    const response = await GET(dashboardRequest());
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(String(payload.error)).toMatch(/Token|autenticação/i);
    expect(mockBuildDashboard).not.toHaveBeenCalled();
  });

  it("rejects a signed-in student or tutor", async () => {
    mockVerifyAdminIdToken.mockRejectedValue(new Error("Acesso restrito a administradores."));

    const response = await GET(
      dashboardRequest({ authorization: "Bearer student-token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Acesso restrito a administradores.");
    expect(mockBuildDashboard).not.toHaveBeenCalled();
  });
});
