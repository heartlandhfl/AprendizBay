import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/bookings/types";
import {
  buildProfessorStudentsPreview,
  countActiveStudents,
} from "@/lib/tutors/students-preview";

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: "b1",
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    status: "confirmed",
    price: 70,
    scheduledAt: {} as Booking["scheduledAt"],
    createdAt: {} as Booking["createdAt"],
    ...overrides,
  };
}

describe("professor students preview", () => {
  it("lists unique students from confirmed and completed bookings only", () => {
    const bookings = [
      booking({ id: "1", studentId: "ana", status: "confirmed" }),
      booking({ id: "2", studentId: "ana", status: "completed" }),
      booking({ id: "3", studentId: "bruno", status: "completed" }),
      booking({ id: "4", studentId: "carla", status: "pending" }),
      booking({ id: "5", studentId: "diego", status: "cancelled" }),
    ];

    const preview = buildProfessorStudentsPreview(bookings, {
      ana: "Ana Souza",
      bruno: "Bruno Lima",
    });

    expect(preview).toEqual([
      { studentId: "ana", displayName: "Ana Souza", lessonCount: 2 },
      { studentId: "bruno", displayName: "Bruno Lima", lessonCount: 1 },
    ]);
    expect(countActiveStudents(bookings)).toBe(2);
  });
});
