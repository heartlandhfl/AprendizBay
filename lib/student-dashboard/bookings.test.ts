import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/bookings/types";
import {
  buildLearningSummary,
  buildPendingActions,
  canStudentJoinLesson,
  getLessonCta,
  getNextLesson,
} from "@/lib/student-dashboard/bookings";
import type { EnrichedStudentBooking } from "@/lib/student-dashboard/types";

function timestamp(iso: string) {
  return {
    toMillis: () => new Date(iso).getTime(),
    toDate: () => new Date(iso),
  } as Booking["scheduledAt"];
}

function booking(overrides: Partial<Booking> & Pick<Booking, "id" | "status">): Booking {
  return {
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    price: 80,
    scheduledAt: timestamp("2026-09-10T14:00:00.000Z"),
    createdAt: timestamp("2026-09-01T10:00:00.000Z"),
    paymentStatus: "unpaid",
    ...overrides,
  } as Booking;
}

function enriched(
  overrides: Partial<EnrichedStudentBooking> & { booking: Booking },
): EnrichedStudentBooking {
  return {
    tutorName: "Prof. Ana",
    subject: "Matemática",
    modality: "online",
    ...overrides,
  };
}

describe("student dashboard bookings", () => {
  const now = new Date("2026-09-05T12:00:00.000Z");

  it("selects the next authoritative upcoming lesson", () => {
    const entries = [
      enriched({
        booking: booking({
          id: "later",
          status: "confirmed",
          scheduledAt: timestamp("2026-09-12T14:00:00.000Z"),
        }),
      }),
      enriched({
        booking: booking({
          id: "next",
          status: "confirmed",
          scheduledAt: timestamp("2026-09-06T14:00:00.000Z"),
        }),
      }),
    ];

    expect(getNextLesson(entries, now)?.booking.id).toBe("next");
  });

  it("supports upcoming collective lessons", () => {
    const entries = [
      enriched({
        booking: booking({
          id: "collective",
          status: "confirmed",
          type: "coletivo",
          hubId: "hub-1",
          scheduledAt: timestamp("2026-09-07T18:00:00.000Z"),
        }),
        subject: "Inglês",
      }),
    ];

    expect(getNextLesson(entries, now)?.booking.type).toBe("coletivo");
  });

  it("shows join CTA only when the lesson can be joined", () => {
    const joinable = booking({
      id: "joinable",
      status: "confirmed",
      paymentStatus: "paid",
      meetingUrl: "https://meet.jit.si/aprendizbay-joinable",
    });

    expect(canStudentJoinLesson(joinable, "online")).toBe(true);
    expect(getLessonCta(joinable, "online")).toEqual({
      label: "Entrar na aula",
      href: "/aulas/joinable",
    });

    const presencial = booking({ id: "presencial", status: "confirmed", paymentStatus: "paid" });
    expect(getLessonCta(presencial, "presencial")).toEqual({
      label: "Ver aula",
      href: "/aulas/presencial",
    });
  });

  it("builds pending payment and request actions", () => {
    const entries = [
      enriched({
        booking: booking({
          id: "payment",
          status: "pending",
          paymentStatus: "awaiting_payment",
        }),
      }),
      enriched({
        booking: booking({
          id: "request",
          status: "pending",
          paymentStatus: "unpaid",
        }),
      }),
    ];

    const actions = buildPendingActions({
      bookings: entries,
      reviewedBookingIds: new Set(),
      conversations: [],
      studentId: "student-1",
      now,
    });

    expect(actions.map((action) => action.type)).toEqual([
      "payment_pending",
      "request_pending",
    ]);
  });

  it("builds review and upcoming lesson actions", () => {
    const entries = [
      enriched({
        booking: booking({
          id: "review",
          status: "completed",
          scheduledAt: timestamp("2026-09-01T14:00:00.000Z"),
        }),
      }),
      enriched({
        booking: booking({
          id: "soon",
          status: "confirmed",
          paymentStatus: "paid",
          scheduledAt: timestamp("2026-09-05T20:00:00.000Z"),
        }),
      }),
    ];

    const actions = buildPendingActions({
      bookings: entries,
      reviewedBookingIds: new Set(),
      conversations: [],
      studentId: "student-1",
      now,
    });

    expect(actions.some((action) => action.type === "review_pending")).toBe(true);
    expect(actions.some((action) => action.type === "upcoming_lesson")).toBe(true);
  });

  it("builds message preview actions for unread conversations", () => {
    const actions = buildPendingActions({
      bookings: [],
      reviewedBookingIds: new Set(),
      conversations: [
        {
          id: "student-1_tutor-1",
          studentId: "student-1",
          tutorId: "tutor-1",
          tutorName: "Prof. Ana",
          lastSenderId: "tutor-1",
          lastMessage: "Olá!",
        },
      ],
      studentId: "student-1",
      now,
    });

    expect(actions[0]).toMatchObject({
      type: "new_message",
      href: "/mensagens?conversa=student-1_tutor-1",
    });
  });

  it("summarizes learning sections from booking data", () => {
    const entries = [
      enriched({
        booking: booking({
          id: "upcoming",
          status: "confirmed",
          scheduledAt: timestamp("2026-09-10T14:00:00.000Z"),
        }),
      }),
      enriched({
        booking: booking({
          id: "history",
          status: "completed",
          scheduledAt: timestamp("2026-08-01T14:00:00.000Z"),
        }),
      }),
      enriched({
        booking: booking({
          id: "class",
          status: "confirmed",
          type: "coletivo",
          hubId: "hub-1",
          scheduledAt: timestamp("2026-09-11T14:00:00.000Z"),
        }),
      }),
    ];

    const summary = buildLearningSummary(entries, now);
    expect(summary.upcomingCount).toBe(2);
    expect(summary.historyCount).toBe(1);
    expect(summary.classCount).toBe(1);
    expect(summary.professorCount).toBe(1);
  });
});
