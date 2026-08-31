import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnsureFirebaseApp } = vi.hoisted(() => ({
  mockEnsureFirebaseApp: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  ensureFirebaseApp: mockEnsureFirebaseApp,
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
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

import { MOCK_TUTORS } from "@/lib/mock-tutors";
import { fetchVerifiedTutors } from "@/lib/tutors/client";

describe("fetchVerifiedTutors", () => {
  beforeEach(() => {
    mockEnsureFirebaseApp.mockReset();
  });

  it("returns unavailable without mock tutors when Firebase is not configured", async () => {
    mockEnsureFirebaseApp.mockResolvedValue(null);

    const result = await fetchVerifiedTutors();

    expect(result.state).toBe("unavailable");
    expect(result.items).toEqual([]);
    expect(result.items.map((tutor) => tutor.name)).not.toEqual(
      expect.arrayContaining(MOCK_TUTORS.map((tutor) => tutor.name)),
    );
  });
});
