import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PEER_PROFILE_CLIENTS = [
  "lib/bookings/service.ts",
  "lib/users/public-profile.ts",
  "components/bookings/TutorDashboardBookings.tsx",
  "components/bookings/TutorConfirmedBookings.tsx",
  "components/lessons/LessonExperience.tsx",
  "components/conversations/SendMessageButton.tsx",
  "components/dashboard/ProfessorHome.tsx",
  "components/dashboard/ProfessorStudentsPreview.tsx",
];

describe("client user-document boundary", () => {
  it("does not read another users/{uid} private account document", () => {
    for (const relativePath of PEER_PROFILE_CLIENTS) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      expect(source, relativePath).not.toMatch(
        /getDoc\s*\(\s*doc\s*\(\s*db\s*,\s*["']users["']/,
      );
    }
  });

  it("loads counterpart names from the public profile helper", () => {
    const bookingService = readFileSync(
      resolve(process.cwd(), "lib/bookings/service.ts"),
      "utf8",
    );
    const fetchFn = bookingService.slice(
      bookingService.indexOf("export async function fetchUserDisplayName"),
      bookingService.indexOf("export async function fetchTutorName"),
    );

    expect(fetchFn).toMatch(/fetchPublicDisplayName/);
    expect(fetchFn).not.toMatch(/["']users["']/);
  });
});
