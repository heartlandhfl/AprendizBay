import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockVerifyAdminIdToken, mockBuildInbox, mockGetFirestore, mockGetAdminApp } =
  vi.hoisted(() => ({
    mockVerifyAdminIdToken: vi.fn(),
    mockBuildInbox: vi.fn(),
    mockGetFirestore: vi.fn(),
    mockGetAdminApp: vi.fn(),
  }));

vi.mock("@/lib/auth/admin-server", () => ({
  verifyAdminIdToken: mockVerifyAdminIdToken,
}));

vi.mock("@/lib/admin/contact-inbox", () => ({
  buildAdminContactInboxList: mockBuildInbox,
  parseAdminContactInboxFilters: vi.fn((params: URLSearchParams) => ({
    status: params.get("status") ?? undefined,
  })),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: mockGetFirestore,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminApp: mockGetAdminApp,
}));

import { GET } from "@/app/api/admin/contact-inbox/route";

function inboxRequest(
  headers: Record<string, string> = {},
  query = "",
): Request {
  return new Request(`http://localhost/api/admin/contact-inbox${query}`, {
    method: "GET",
    headers,
  });
}

describe("GET /api/admin/contact-inbox", () => {
  beforeEach(() => {
    mockVerifyAdminIdToken.mockReset();
    mockBuildInbox.mockReset();
    mockGetFirestore.mockReset();
    mockGetAdminApp.mockReset();
    mockGetAdminApp.mockReturnValue({ name: "admin-app" });
    mockGetFirestore.mockReturnValue({ collection: vi.fn() });
    mockBuildInbox.mockResolvedValue({
      generatedAt: "2026-09-03T12:00:00.000Z",
      summary: {
        total: { available: true, value: 1 },
        unread: { available: true, value: 1 },
        read: { available: true, value: 0 },
        replied: { available: true, value: 0 },
        archived: { available: true, value: 0 },
        deliveryFailed: { available: true, value: 1 },
        deliverySkipped: { available: true, value: 0 },
      },
      messages: [],
      filters: {},
      truncated: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the inbox only after admin authorization", async () => {
    mockVerifyAdminIdToken.mockResolvedValue("admin-1");

    const response = await GET(
      inboxRequest({ authorization: "Bearer admin-token" }, "?status=unread"),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockVerifyAdminIdToken).toHaveBeenCalledWith("admin-token");
    expect(mockBuildInbox).toHaveBeenCalledTimes(1);
    expect(payload.inbox).toMatchObject({
      generatedAt: "2026-09-03T12:00:00.000Z",
    });
  });

  it("rejects an unauthenticated request before loading Firebase data", async () => {
    mockVerifyAdminIdToken.mockRejectedValue(new Error("Token de autenticação ausente."));

    const response = await GET(inboxRequest());
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(String(payload.error)).toMatch(/Token|autenticação/i);
    expect(mockBuildInbox).not.toHaveBeenCalled();
  });
});
