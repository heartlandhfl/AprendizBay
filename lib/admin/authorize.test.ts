import { describe, expect, it } from "vitest";
import { assertAdminUser, statusFromAdminError } from "@/lib/admin/authorize";

describe("assertAdminUser", () => {
  it("allows only users with the admin role", () => {
    expect(() => assertAdminUser({ role: "admin" })).not.toThrow();
  });

  it("rejects missing profiles, students and tutors", () => {
    for (const profile of [null, undefined, { role: "student" }, { role: "tutor" }, {}]) {
      try {
        assertAdminUser(profile);
        throw new Error("expected forbidden");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Acesso restrito a administradores.");
        expect((error as Error & { code?: string }).code).toBe("FORBIDDEN");
        expect(statusFromAdminError(error)).toBe(403);
      }
    }
  });

  it("maps missing tokens to 401 and Firebase Admin outages to 503", () => {
    expect(statusFromAdminError(new Error("Token de autenticação ausente."))).toBe(401);
    expect(
      statusFromAdminError(
        new Error("Firebase Admin SDK requires FIREBASE_ADMIN_PROJECT_ID."),
      ),
    ).toBe(503);
  });
});
