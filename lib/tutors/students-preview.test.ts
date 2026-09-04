import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/bookings/types";
import {
  buildProfessorStudentsPreview,
  countActiveStudents,
} from "@/lib/tutors/students-preview";

function timestamp(iso: string) {
  const date = new Date(iso);
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: "b1",
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    status: "confirmed",
    price: 70,
    scheduledAt: timestamp("2026-09-01T10:00:00") as Booking["scheduledAt"],
    createdAt: timestamp("2026-09-01T10:00:00") as Booking["createdAt"],
    ...overrides,
  };
}

describe("professor students preview", () => {
  const now = new Date("2026-09-04T12:00:00");

  it("lists unique students from confirmed and completed bookings only", () => {
    const bookings = [
      booking({ id: "1", studentId: "ana", status: "confirmed" }),
      booking({ id: "2", studentId: "ana", status: "completed" }),
      booking({ id: "3", studentId: "bruno", status: "completed" }),
      booking({ id: "4", studentId: "carla", status: "pending" }),
      booking({ id: "5", studentId: "diego", status: "cancelled" }),
    ];

    const preview = buildProfessorStudentsPreview(
      bookings,
      {
        ana: "Ana Souza",
        bruno: "Bruno Lima",
      },
      { tutorSubject: "Inglês", now },
    );

    expect(preview).toEqual([
      {
        studentId: "ana",
        displayName: "Ana Souza",
        lessonCount: 2,
        subject: "Inglês",
        lastLessonLabel: expect.any(String),
      },
      {
        studentId: "bruno",
        displayName: "Bruno Lima",
        lessonCount: 1,
        subject: "Inglês",
        lastLessonLabel: expect.any(String),
      },
    ]);
    expect(countActiveStudents(bookings)).toBe(2);
  });

  it("includes upcoming lesson labels for future confirmed bookings", () => {
    const preview = buildProfessorStudentsPreview(
      [
        booking({
          id: "upcoming",
          studentId: "ana",
          status: "confirmed",
          scheduledAt: timestamp("2026-09-10T14:00:00") as Booking["scheduledAt"],
        }),
      ],
      { ana: "Ana Souza" },
      { tutorSubject: "Matemática", now },
    );

    expect(preview[0]).toMatchObject({
      studentId: "ana",
      subject: "Matemática",
      upcomingLessonLabel: expect.any(String),
    });
  });
});
