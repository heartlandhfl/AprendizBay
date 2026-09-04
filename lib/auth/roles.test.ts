import { describe, expect, it } from "vitest";
import {
  isCanonicalRole,
  isLecturerRole,
  isPrivilegedRole,
  isStudentRole,
  normalizeRole,
  roleDisplayLabel,
  roleMatchesAny,
} from "@/lib/auth/roles";

describe("roles", () => {
  it("normalizes legacy tutor to lecturer", () => {
    expect(normalizeRole("tutor")).toBe("lecturer");
    expect(isLecturerRole("tutor")).toBe(true);
    expect(isLecturerRole("lecturer")).toBe(true);
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
    expect(roleDisplayLabel("student")).toBe("Aluno");
  });

  it("treats privileged roles correctly", () => {
    expect(isPrivilegedRole("admin")).toBe(true);
    expect(isPrivilegedRole("lecturer")).toBe(true);
    expect(isPrivilegedRole("facilitator")).toBe(true);
    expect(isPrivilegedRole("support")).toBe(true);
    expect(isPrivilegedRole("student")).toBe(false);
    expect(isStudentRole("student")).toBe(true);
    expect(isStudentRole("lecturer")).toBe(false);
  });

  it("matches lecturer guards against legacy tutor profiles", () => {
    expect(roleMatchesAny("tutor", ["lecturer"])).toBe(true);
    expect(roleMatchesAny("lecturer", ["tutor"])).toBe(true);
    expect(roleMatchesAny("lecturer", ["lecturer"])).toBe(true);
    expect(roleMatchesAny("student", ["lecturer"])).toBe(false);
    expect(roleMatchesAny("lecturer", ["student"])).toBe(false);
    expect(roleMatchesAny("admin", ["admin"])).toBe(true);
    expect(roleMatchesAny("facilitator", ["admin"])).toBe(false);
    expect(roleMatchesAny("student", undefined)).toBe(true);
  });
});
