import { describe, expect, it } from "vitest";
import {
  isCanonicalRole,
  isLecturerRole,
  isPrivilegedRole,
  normalizeRole,
  roleDisplayLabel,
} from "@/lib/auth/roles";

describe("roles", () => {
  it("normalizes legacy tutor to lecturer", () => {
    expect(normalizeRole("tutor")).toBe("lecturer");
    expect(isLecturerRole("tutor")).toBe(true);
  });

  it("keeps canonical role identifiers", () => {
    for (const role of ["student", "lecturer", "admin", "facilitator", "support"] as const) {
      expect(isCanonicalRole(role)).toBe(true);
      expect(normalizeRole(role)).toBe(role);
    }
  });

  it("labels lecturer/tutor as Professor in Portuguese", () => {
    expect(roleDisplayLabel("lecturer")).toBe("Professor");
    expect(roleDisplayLabel("tutor")).toBe("Professor");
  });

  it("treats privileged roles correctly", () => {
    expect(isPrivilegedRole("admin")).toBe(true);
    expect(isPrivilegedRole("lecturer")).toBe(true);
    expect(isPrivilegedRole("facilitator")).toBe(true);
    expect(isPrivilegedRole("support")).toBe(true);
    expect(isPrivilegedRole("student")).toBe(false);
  });
});
