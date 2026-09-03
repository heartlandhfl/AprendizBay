import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockVerifyAdminIdToken, mockBuildMonitor, mockGetFirestore, mockGetAdminApp } =
  vi.hoisted(() => ({
    mockVerifyAdminIdToken: vi.fn(),
    mockBuildMonitor: vi.fn(),
    mockGetFirestore: vi.fn(),
    mockGetAdminApp: vi.fn(),
  }));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyAdminIdToken: mockVerifyAdminIdToken,
}));

vi.mock("@/lib/admin/email-outbox", () => ({
  buildAdminEmailDeliveryMonitor: mockBuildMonitor,
  parseAdminEmailOutboxFilters: vi.fn((params: URLSearchParams) => ({
    eventName: params.get("event") ?? undefined,
  })),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: mockGetFirestore,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminApp: mockGetAdminApp,
}));

import { GET } from "@/app/api/admin/email-outbox/route";

function monitorRequest(
  headers: Record<string, string> = {},
  query = "",
): Request {
  return new Request(`http://localhost/api/admin/email-outbox${query}`, {
    method: "GET",
    headers,
  });
}

describe("GET /api/admin/email-outbox", () => {
  beforeEach(() => {
    mockVerifyAdminIdToken.mockReset();
    mockBuildMonitor.mockReset();
    mockGetFirestore.mockReset();
    mockGetAdminApp.mockReset();
    mockGetAdminApp.mockReturnValue({ name: "admin-app" });
    mockGetFirestore.mockReturnValue({ collection: vi.fn() });
    mockBuildMonitor.mockResolvedValue({
      generatedAt: "2026-09-03T12:00:00.000Z",
      summary: {
        totalSent: { available: true, value: 10 },
        pending: { available: true, value: 1 },
        processing: { available: true, value: 0 },
        delivered: { available: true, value: 8 },
        failed: { available: true, value: 0 },
        bounced: { available: true, value: 1 },
        complained: { available: true, value: 0 },
        permanentlyFailed: { available: true, value: 0 },
      },
      alerts: [],
      emails: [],
      filters: {},
      truncated: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the monitor only after admin authorization", async () => {
    mockVerifyAdminIdToken.mockResolvedValue("admin-1");

    const response = await GET(
      monitorRequest({ authorization: "Bearer admin-token" }, "?event=BOOKING_ACCEPTED"),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockVerifyAdminIdToken).toHaveBeenCalledWith("admin-token");
    expect(mockBuildMonitor).toHaveBeenCalledTimes(1);
    expect(payload.monitor).toMatchObject({
      generatedAt: "2026-09-03T12:00:00.000Z",
    });
  });

  it("rejects an unauthenticated request before loading Firebase data", async () => {
    mockVerifyAdminIdToken.mockRejectedValue(new Error("Token de autenticação ausente."));

    const response = await GET(monitorRequest());
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(String(payload.error)).toMatch(/Token|autenticação/i);
    expect(mockBuildMonitor).not.toHaveBeenCalled();
  });

  it("rejects a signed-in student or tutor", async () => {
    mockVerifyAdminIdToken.mockRejectedValue(new Error("Acesso restrito a administradores."));

    const response = await GET(
      monitorRequest({ authorization: "Bearer student-token" }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Acesso restrito a administradores.");
    expect(mockBuildMonitor).not.toHaveBeenCalled();
  });
});
