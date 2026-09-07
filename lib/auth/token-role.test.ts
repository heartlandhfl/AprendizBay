import { describe, expect, it } from "vitest";
import { resolveAuthoritativeRole } from "@/lib/auth/token-role";

describe("resolveAuthoritativeRole", () => {
  it("prefers custom claims over profile metadata", () => {
    expect(resolveAuthoritativeRole("student", "admin")).toBe("admin");
    expect(resolveAuthoritativeRole("admin", "student")).toBe("student");
  });

  it("does not treat profile-only admin as an administrator", () => {
    expect(resolveAuthoritativeRole("admin", null)).toBe("student");
  });

  it("keeps lecturer profile fallback for professor signup", () => {
    expect(resolveAuthoritativeRole("tutor", null)).toBe("lecturer");
    expect(resolveAuthoritativeRole("lecturer", null)).toBe("lecturer");
  });

  it("falls back to student for profile-only facilitator and support", () => {
    expect(resolveAuthoritativeRole("facilitator", null)).toBe("student");
    expect(resolveAuthoritativeRole("support", null)).toBe("student");
  });
});
