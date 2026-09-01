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
    areMockTutorsEnabled: () => true,
  };
});

import { MOCK_TUTORS } from "@/lib/mock-tutors";
import { fetchVerifiedTutors } from "@/lib/tutors/client";

describe("fetchVerifiedTutors mock mode", () => {
  beforeEach(() => {
    mockEnsureFirebaseApp.mockReset();
  });

  it("NODE_ENV=test/development + mock mode explicitly enabled → mocks may be used", async () => {
    mockEnsureFirebaseApp.mockResolvedValue(null);

    const result = await fetchVerifiedTutors();

    expect(result.state).toBe("ok");
    expect(result.items.map((tutor) => tutor.name)).toEqual(
      expect.arrayContaining(MOCK_TUTORS.map((tutor) => tutor.name)),
    );
  });
});
