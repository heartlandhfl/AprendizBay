import { describe, expect, it } from "vitest";
import {
  publicProfileFromUserData,
  readOrBackfillPublicProfile,
} from "@/lib/users/public-profile-server";

describe("publicProfileFromUserData", () => {
  it("keeps only displayName and photoUrl", () => {
    const profile = publicProfileFromUserData({
      role: "admin",
      displayName: "Ana Souza",
      email: "ana@secret.com",
      photoUrl: "https://example.com/ana.jpg",
      createdAt: "2026-01-01",
      updatedAt: "2026-02-01",
      isAdmin: true,
    });

    expect(profile).toEqual({
      displayName: "Ana Souza",
      photoUrl: "https://example.com/ana.jpg",
    });
    expect(profile).not.toHaveProperty("email");
    expect(profile).not.toHaveProperty("role");
  });

  it("falls back to Usuário when the name is missing", () => {
    expect(publicProfileFromUserData({ email: "x@test.com", role: "student" })).toEqual({
      displayName: "Usuário",
      photoUrl: null,
    });
  });

  it("returns null for missing documents", () => {
    expect(publicProfileFromUserData(undefined)).toBeNull();
    expect(publicProfileFromUserData(null)).toBeNull();
  });
});

describe("readOrBackfillPublicProfile", () => {
  it("does not copy private account fields when backfilling from users/{uid}", async () => {
    const writes: Array<{ path: string; data: Record<string, unknown> }> = [];
    const db = {
      collection(name: string) {
        return {
          doc(id: string) {
            return {
              collection() {
                return {
                  doc() {
                    return {
                      get: async () => ({ exists: false, data: () => undefined }),
                      set: async (data: Record<string, unknown>) => {
                        writes.push({ path: `${name}/${id}/public/profile`, data });
                      },
                    };
                  },
                };
              },
              get: async () => ({
                exists: true,
                data: () => ({
                  role: "student",
                  email: "bruno@secret.com",
                  displayName: "Bruno Lima",
                  createdAt: new Date(),
                }),
              }),
            };
          },
        };
      },
    };

    const profile = await readOrBackfillPublicProfile(db, "student-2", {
      serverTimestamp: () => "TS",
    });

    expect(profile).toEqual({ displayName: "Bruno Lima", photoUrl: null });
    expect(writes).toHaveLength(1);
    expect(writes[0]?.data).toEqual({
      displayName: "Bruno Lima",
      photoUrl: null,
      updatedAt: "TS",
    });
    expect(writes[0]?.data).not.toHaveProperty("email");
    expect(writes[0]?.data).not.toHaveProperty("role");
  });

  it("returns null when the private account document is gone", async () => {
    const db = {
      collection() {
        return {
          doc() {
            return {
              collection() {
                return {
                  doc() {
                    return {
                      get: async () => ({ exists: false, data: () => undefined }),
                      set: async () => undefined,
                    };
                  },
                };
              },
              get: async () => ({ exists: false, data: () => undefined }),
            };
          },
        };
      },
    };

    await expect(readOrBackfillPublicProfile(db, "missing")).resolves.toBeNull();
  });
});
