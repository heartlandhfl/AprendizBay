import { describe, expect, it } from "vitest";
import { getProfessorDashboardContextualMessage } from "@/lib/tutor-dashboard/contextual-message";

describe("getProfessorDashboardContextualMessage", () => {
  it("prioritizes upcoming lessons", () => {
    expect(
      getProfessorDashboardContextualMessage({
        upcomingLessonCount: 1,
        pendingRequestCount: 2,
        unreadMessageCount: 1,
      }),
    ).toContain("próximas aulas");
  });

  it("mentions pending requests when there are no upcoming lessons", () => {
    expect(
      getProfessorDashboardContextualMessage({
        upcomingLessonCount: 0,
        pendingRequestCount: 1,
        unreadMessageCount: 0,
      }),
    ).toContain("solicitações");
  });
});
