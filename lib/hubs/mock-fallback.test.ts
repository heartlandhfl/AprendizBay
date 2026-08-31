import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnsureFirebaseApp } = vi.hoisted(() => ({
  mockEnsureFirebaseApp: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  ensureFirebaseApp: mockEnsureFirebaseApp,
  requireFirebaseApp: vi.fn(),
  whenFirebaseReady: vi.fn(),
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: { fromDate: vi.fn() },
  where: vi.fn(),
}));

vi.mock("@/lib/tutors/mock-gate", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tutors/mock-gate")>(
    "@/lib/tutors/mock-gate",
  );
  return {
    ...actual,
    areMockTutorsEnabled: () => false,
  };
});

import { fetchCollectiveHubById, fetchOpenCollectiveHubs } from "@/lib/hubs/service";

describe("collective hub mock fallback", () => {
  beforeEach(() => {
    mockEnsureFirebaseApp.mockReset();
    mockEnsureFirebaseApp.mockResolvedValue(null);
  });

  it("does not invent fake classes when Firebase is unavailable", async () => {
    const hubs = await fetchOpenCollectiveHubs();
    const hub = await fetchCollectiveHubById("hub-m1");

    expect(hubs.state).toBe("unavailable");
    expect(hubs.items).toEqual([]);
    expect(hub.state).toBe("unavailable");
    expect(hub.hub).toBeNull();
    expect(JSON.stringify(hubs)).not.toContain("Mariana Silva");
    expect(JSON.stringify(hub)).not.toContain("Inglês para Viagem");
  });
});
