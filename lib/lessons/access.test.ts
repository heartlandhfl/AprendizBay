import { describe, expect, it } from "vitest";
import { canAccessLesson } from "@/lib/lessons/access";

const BOOKING = { studentId: "student-1", tutorId: "tutor-1" };

describe("canAccessLesson", () => {
  it("allows only the student and the tutor on the booking", () => {
    expect(canAccessLesson(BOOKING, "student-1")).toBe(true);
    expect(canAccessLesson(BOOKING, "tutor-1")).toBe(true);
  });

  it("denies another student, another tutor, an admin, and anonymous users", () => {
    expect(canAccessLesson(BOOKING, "student-2")).toBe(false);
    expect(canAccessLesson(BOOKING, "tutor-2")).toBe(false);
    expect(canAccessLesson(BOOKING, "admin-1")).toBe(false);
    expect(canAccessLesson(BOOKING, "")).toBe(false);
    expect(canAccessLesson(BOOKING, null)).toBe(false);
    expect(canAccessLesson(null, "student-1")).toBe(false);
  });
});
