import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetCustomUserClaims = vi.fn();
const mockGetUser = vi.fn();
const mockDocSet = vi.fn();
const mockDocGet = vi.fn();

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    setCustomUserClaims: mockSetCustomUserClaims,
    getUser: mockGetUser,
  }),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "SERVER_TS" },
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: mockDocGet,
        set: mockDocSet,
      }),
    }),
  }),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminApp: () => ({}),
}));

import {
  assertAdminFromClaims,
  getRole,
  roleFromDecodedToken,
  setRole,
  syncSignupRoleFromProfile,
} from "@/lib/auth/role-server";

describe("role-server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: "tutor", email: "prof@test.com", displayName: "Prof" }),
    });
    mockGetUser.mockResolvedValue({ uid: "uid-1", email: "prof@test.com", customClaims: {} });
  });

  it("reads role from custom claims", () => {
    expect(roleFromDecodedToken({ role: "admin" })).toBe("admin");
    expect(roleFromDecodedToken({ role: "lecturer" })).toBe("lecturer");
  });

  it("assertAdminFromClaims allows only admin", () => {
    expect(() => assertAdminFromClaims({ role: "admin" })).not.toThrow();
    expect(() => assertAdminFromClaims({ role: "lecturer" })).toThrow(/administradores/);
    expect(() => assertAdminFromClaims({ role: "facilitator" })).toThrow(/administradores/);
    expect(() => assertAdminFromClaims({ role: "support" })).toThrow(/administradores/);
  });

  it("setRole writes custom claim and profile", async () => {
    await setRole("uid-1", "admin", { email: "a@test.com", displayName: "Admin" });
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("uid-1", { role: "admin" });
    expect(mockDocSet).toHaveBeenCalled();
  });

  it("getRole returns claim role", async () => {
    mockGetUser.mockResolvedValue({ customClaims: { role: "facilitator" } });
    await expect(getRole("uid-1")).resolves.toBe("facilitator");
  });

  it("syncSignupRoleFromProfile grants lecturer claim for tutor profile", async () => {
    mockGetUser.mockResolvedValue({ uid: "uid-1", email: "prof@test.com", customClaims: {} });
    await syncSignupRoleFromProfile("uid-1");
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("uid-1", { role: "lecturer" });
  });

  it("syncSignupRoleFromProfile is idempotent for students", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: "student", email: "s@test.com" }),
    });
    await expect(syncSignupRoleFromProfile("uid-1")).resolves.toBe("student");
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });
});
