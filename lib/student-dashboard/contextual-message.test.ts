import { describe, expect, it } from "vitest";
import { getDashboardContextualMessage } from "@/lib/student-dashboard/contextual-message";
import type { EnrichedStudentBooking } from "@/lib/student-dashboard/types";

describe("getDashboardContextualMessage", () => {
  const nextLesson = {
    booking: { id: "b1" },
    tutorName: "Prof. Ana",
    subject: "Matemática",
    modality: "online",
  } as EnrichedStudentBooking;

  it("prioritizes next lesson messaging", () => {
    expect(
      getDashboardContextualMessage({
        nextLesson,
        pendingActionCount: 2,
        unreadMessageCount: 1,
      }),
    ).toContain("próxima aula");
  });

  it("mentions pending actions when there is no next lesson", () => {
    expect(
      getDashboardContextualMessage({
        nextLesson: null,
        pendingActionCount: 1,
        unreadMessageCount: 0,
      }),
    ).toContain("pendências");
  });

  it("falls back to onboarding guidance", () => {
    expect(
      getDashboardContextualMessage({
        nextLesson: null,
        pendingActionCount: 0,
        unreadMessageCount: 0,
      }),
    ).toContain("Encontre um professor");
  });
});
