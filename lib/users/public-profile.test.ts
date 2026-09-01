import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDoc, mockRequireFirebaseApp, mockGetIdToken } = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
  mockRequireFirebaseApp: vi.fn(),
  mockGetIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  auth: {
    get currentUser() {
      return { uid: "tutor-1", getIdToken: mockGetIdToken };
    },
  },
  db: {},
  requireFirebaseApp: mockRequireFirebaseApp,
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => segments.join("/")),
  getDoc: mockGetDoc,
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

import { fetchPublicDisplayName } from "@/lib/users/public-profile";

describe("fetchPublicDisplayName", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockRequireFirebaseApp.mockReset();
    mockGetIdToken.mockReset();
    mockRequireFirebaseApp.mockResolvedValue(undefined);
    mockGetIdToken.mockResolvedValue("id-token");
    vi.unstubAllGlobals();
  });

  it("reads displayName from the public profile document", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ displayName: "Bruno Lima", photoUrl: null }),
    });

    await expect(fetchPublicDisplayName("student-2")).resolves.toBe("Bruno Lima");
    expect(mockGetDoc).toHaveBeenCalled();
  });

  it("falls back to the public-profile API without exposing private fields", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ displayName: "Ana Souza", photoUrl: null }),
      }),
    );

    await expect(fetchPublicDisplayName("student-1")).resolves.toBe("Ana Souza");
    expect(fetch).toHaveBeenCalledWith(
      "/api/users/public-profile/student-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer id-token",
        }),
      }),
    );
  });

  it("returns Conta encerrada when the public profile API reports a missing account", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: "Conta encerrada." }),
      }),
    );

    await expect(fetchPublicDisplayName("gone")).resolves.toBe("Conta encerrada");
  });
});
