import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("role route guards", () => {
  it("guards lecturer routes with the canonical lecturer role", () => {
    for (const page of [
      "app/tutor/dashboard/page.tsx",
      "app/tutor/onboarding/page.tsx",
      "app/tutor/settings/page.tsx",
    ]) {
      const contents = source(page);
      expect(contents).toContain('roles={["lecturer"]}');
      expect(contents).not.toContain('roles={["tutor"]}');
    }

    const dashboard = source("app/tutor/dashboard/page.tsx");
    expect(dashboard).toContain("ProfessorHome");
    expect(dashboard).not.toContain("StudentHome");
    expect(source("components/dashboard/ProfessorHome.tsx")).not.toContain("jitsi");
  });

  it("keeps the student dashboard student-only and does not duplicate bookings", () => {
    const dashboard = source("app/dashboard/page.tsx");
    expect(dashboard).toContain('roles={["student"]}');
    expect(dashboard).not.toContain("StudentBookingsList");
    expect(dashboard).toContain("StudentDashboardContent");

    const home = source("components/student-dashboard/StudentDashboardContent.tsx");
    expect(home).not.toContain("StudentBookingsList");
    expect(home).toContain("Encontrar um professor");
    expect(home).toContain('href="/bookings"');
  });

  it("keeps bookings as the dedicated classes page", () => {
    const bookings = source("app/bookings/page.tsx");
    expect(bookings).toContain("BookingsPageContent");
    expect(source("components/bookings/BookingsPageContent.tsx")).toContain(
      "StudentBookingsList",
    );
  });

  it("does not broaden admin access", () => {
    expect(source("app/admin/layout.tsx")).toContain('roles={["admin"]}');
  });
});
