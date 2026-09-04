import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/bookings/types";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { buildUpcomingProfessorLessons } from "@/lib/tutors/upcoming-lessons";

function timestamp(iso: string) {
  const date = new Date(iso);
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

function booking(overrides: Partial<Booking> & Pick<Booking, "id" | "type" | "scheduledAt">): Booking {
  return {
    studentId: "student-1",
    tutorId: "tutor-1",
    status: "confirmed",
    paymentStatus: "paid",
    price: 70,
    createdAt: timestamp("2026-09-01T10:00:00") as Booking["createdAt"],
    ...overrides,
  } as Booking;
}

function hub(overrides: Partial<CollectiveHubLive> = {}): CollectiveHubLive {
  return {
    id: "hub-1",
    title: "Inglês para Viagem",
    description: "Turma coletiva",
    confirmedStudents: 3,
    maxStudents: 6,
    currentPrice: 25,
    fullPrice: 18,
    schedule: "Terça 19h",
    modality: "online",
    tutorId: "tutor-1",
    status: "open",
    subject: "Inglês",
    scheduledDate: "2026-09-10",
    startTime: "19:00",
    isJoined: false,
    ...overrides,
  };
}

describe("buildUpcomingProfessorLessons", () => {
  const now = new Date("2026-09-04T12:00:00");
  const tutorProfile = { subject: "Inglês", modality: "online" as const };

  it("includes upcoming confirmed and paid lessons with lesson metadata", () => {
    const lessons = buildUpcomingProfessorLessons(
      [
        booking({
          id: "ind-1",
          type: "individual",
          scheduledAt: timestamp("2026-09-05T14:00:00") as Booking["scheduledAt"],
          meetingUrl: "https://meet.jit.si/aprendizbay-ind-1",
        }),
        booking({
          id: "col-1",
          type: "coletivo",
          hubId: "hub-1",
          studentId: "student-2",
          scheduledAt: timestamp("2026-09-06T19:00:00") as Booking["scheduledAt"],
        }),
      ],
      [hub()],
      { "student-1": "Ana Souza", "student-2": "Bruno Lima" },
      tutorProfile,
      now,
    );

    expect(lessons).toHaveLength(2);
    expect(lessons[0]).toMatchObject({
      kind: "individual",
      studentName: "Ana Souza",
      subject: "Inglês",
      lessonHref: "/aulas/ind-1",
      lessonCtaLabel: "Entrar na aula",
    });
    expect(lessons[1]).toMatchObject({
      kind: "coletiva",
      studentName: "Bruno Lima",
      subject: "Inglês",
      lessonHref: "/aulas/col-1",
    });
    expect(lessons.every((lesson) => !lesson.lessonHref?.includes("jitsi"))).toBe(true);
  });

  it("omits confirmed lessons that are not paid yet", () => {
    const lessons = buildUpcomingProfessorLessons(
      [
        booking({
          id: "awaiting",
          type: "individual",
          paymentStatus: "awaiting_payment",
          scheduledAt: timestamp("2026-09-05T14:00:00") as Booking["scheduledAt"],
        }),
      ],
      [],
      { "student-1": "Ana Souza" },
      tutorProfile,
      now,
    );

    expect(lessons).toEqual([]);
  });

  it("includes an upcoming hub without constructing a lesson URL", () => {
    const lessons = buildUpcomingProfessorLessons([], [hub()], {}, tutorProfile, now);

    expect(lessons).toHaveLength(1);
    expect(lessons[0]).toMatchObject({
      kind: "coletiva",
      title: "Inglês para Viagem",
      lessonHref: null,
      lessonCtaLabel: null,
      hubHref: "/turmas/hub-1",
    });
  });

  it("omits past lessons instead of inventing replacements", () => {
    const lessons = buildUpcomingProfessorLessons(
      [
        booking({
          id: "past-1",
          type: "individual",
          scheduledAt: timestamp("2026-09-01T10:00:00") as Booking["scheduledAt"],
        }),
      ],
      [hub({ scheduledDate: "2026-09-01", startTime: "09:00" })],
      { "student-1": "Ana Souza" },
      tutorProfile,
      now,
    );

    expect(lessons).toEqual([]);
  });
});
