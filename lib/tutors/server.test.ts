import { afterEach, describe, expect, it, vi } from "vitest";
import { MOCK_TUTORS } from "@/lib/mock-tutors";

const { mockGetApps, mockGetFirestore } = vi.hoisted(() => ({
  mockGetApps: vi.fn(() => []),
  mockGetFirestore: vi.fn(),
}));

vi.mock("firebase-admin/app", () => ({
  cert: vi.fn((value) => value),
  getApps: mockGetApps,
  initializeApp: vi.fn(() => ({ name: "admin-test" })),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: mockGetFirestore,
}));

function emptySnapshot() {
  return { empty: true, docs: [] };
}

function docsSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    empty: docs.length === 0,
    docs: docs.map((doc) => ({
      id: doc.id,
      data: () => doc.data,
    })),
  };
}

function mockFirestore(options: {
  empty?: boolean;
  error?: Error;
  tutors?: Array<{ id: string; data: Record<string, unknown> }>;
}) {
  const snapshot = options.error
    ? Promise.reject(options.error)
    : Promise.resolve(
        options.empty || !options.tutors
          ? emptySnapshot()
          : docsSnapshot(options.tutors),
      );

  mockGetFirestore.mockReturnValue({
    collection: () => ({
      where: () => ({
        get: () => snapshot,
        where: () => ({ get: () => snapshot }),
      }),
      limit: () => ({ get: () => snapshot }),
      doc: (id: string) => ({
        get: async () => {
          const found = options.tutors?.find((tutor) => tutor.id === id);
          return {
            exists: Boolean(found),
            id,
            data: () => found?.data,
          };
        },
      }),
    }),
  });
}

async function loadServer() {
  return import("@/lib/tutors/server");
}

describe("fetchVerifiedTutorsServer production guards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    mockGetFirestore.mockReset();
    mockGetApps.mockReset();
    mockGetApps.mockReturnValue([]);
  });

  it("NODE_ENV=production + Firebase unavailable → error state and zero mock tutors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_MOCK_TUTORS", "true");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_MOCK_TUTORS", "true");
    vi.stubEnv("FIREBASE_ADMIN_PROJECT_ID", "");
    vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "");
    vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", "");

    const { fetchVerifiedTutorsServer, fetchAllTutorIds, fetchTutorProfile } =
      await loadServer();

    const catalog = await fetchVerifiedTutorsServer();
    const ids = await fetchAllTutorIds();
    const profile = await fetchTutorProfile("1");

    expect(catalog.state).toBe("unavailable");
    expect(catalog.items).toEqual([]);
    expect(ids.items).toEqual([]);
    expect(profile.state).toBe("unavailable");
    expect(profile.tutor).toBeUndefined();
    expect(JSON.stringify(catalog)).not.toContain("Mariana Silva");
    expect(catalog.items).not.toEqual(MOCK_TUTORS);
  });

  it("NODE_ENV=production + Firebase returns zero tutors → empty catalog and zero mock tutors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_MOCK_TUTORS", "true");
    vi.stubEnv("FIREBASE_ADMIN_PROJECT_ID", "demo-aprendiz-bay");
    vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "admin@example.com");
    vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----");
    mockFirestore({ empty: true });

    const { fetchVerifiedTutorsServer, fetchAllTutorIds } = await loadServer();
    const catalog = await fetchVerifiedTutorsServer();
    const ids = await fetchAllTutorIds();

    expect(catalog.state).toBe("empty");
    expect(catalog.items).toEqual([]);
    expect(ids.items).toEqual([]);
    expect(catalog.items.map((tutor) => tutor.name)).not.toEqual(
      expect.arrayContaining(MOCK_TUTORS.map((tutor) => tutor.name)),
    );
  });

  it("NODE_ENV=production + Firebase query fails → error state and zero mock tutors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_MOCK_TUTORS", "true");
    vi.stubEnv("FIREBASE_ADMIN_PROJECT_ID", "demo-aprendiz-bay");
    vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "admin@example.com");
    vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----");
    mockFirestore({ error: new Error("Firestore offline") });

    const { fetchVerifiedTutorsServer } = await loadServer();
    const catalog = await fetchVerifiedTutorsServer();

    expect(catalog.state).toBe("error");
    expect(catalog.items).toEqual([]);
    expect(JSON.stringify(catalog)).not.toContain("Mariana Silva");
  });

  it("NODE_ENV=test + mock mode explicitly enabled → mocks may be used", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ENABLE_MOCK_TUTORS", "true");
    vi.stubEnv("FIREBASE_ADMIN_PROJECT_ID", "");
    vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "");
    vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", "");

    const { fetchVerifiedTutorsServer, fetchTutorProfile } = await loadServer();
    const catalog = await fetchVerifiedTutorsServer();
    const profile = await fetchTutorProfile("1");

    expect(catalog.state).toBe("ok");
    expect(catalog.items.map((tutor) => tutor.name)).toContain("Mariana Silva");
    expect(profile.state).toBe("ok");
    expect(profile.tutor?.name).toBe("Mariana Silva");
  });
});
