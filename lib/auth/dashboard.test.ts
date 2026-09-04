import { describe, expect, it } from "vitest";
import {
  getDashboardLabel,
  getDashboardPath,
  shouldShowBecomeTutorNav,
} from "@/lib/auth/dashboard";

describe("dashboard routing", () => {
  it("maps roles to focused dashboard paths", () => {
    expect(getDashboardPath("student")).toBe("/bookings");
    expect(getDashboardPath("tutor")).toBe("/tutor/dashboard");
    expect(getDashboardPath("lecturer")).toBe("/tutor/dashboard");
    expect(getDashboardPath("admin")).toBe("/admin");
    expect(getDashboardPath("facilitator")).toBe("/facilitador");
    expect(getDashboardPath(null)).toBe("/");
  });

  it("labels dashboards in Portuguese", () => {
    expect(getDashboardLabel("student")).toBe("Minhas aulas");
    expect(getDashboardLabel("tutor")).toBe("Meu painel");
    expect(getDashboardLabel("admin")).toBe("Painel admin");
  });

  it("hides become-tutor nav for lecturers", () => {
    expect(shouldShowBecomeTutorNav("student")).toBe(true);
    expect(shouldShowBecomeTutorNav("tutor")).toBe(false);
    expect(shouldShowBecomeTutorNav("lecturer")).toBe(false);
  });
});
