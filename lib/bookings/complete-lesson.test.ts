import { describe, expect, it } from "vitest";
import {
  assertCanCompleteLesson,
  canTutorMarkCompleted,
  completeLessonForActor,
  studentCompletedLessonCopy,
} from "./complete-lesson";

const NOW = new Date("2026-08-31T20:00:00.000Z");
const PAST = new Date("2026-08-30T19:00:00.000Z");
const FUTURE = new Date("2026-09-01T19:00:00.000Z");

const CONFIRMED_PAID = {
  studentId: "student-1",
  tutorId: "tutor-1",
  status: "confirmed",
  paymentStatus: "paid",
  scheduledAt: PAST,
};

function createFakeDb(options: {
  booking?: Record<string, unknown> | null;
  actorRole?: string;
} = {}) {
  const updates: Array<Record<string, unknown>> = [];
  let booking = options.booking === undefined ? { ...CONFIRMED_PAID } : options.booking;

  const bookingRef = {
    id: "booking-1",
    async get() {
      return {
        exists: booking != null,
        id: "booking-1",
        data: () => booking,
      };
    },
  };

  const db = {
    collection(name: string) {
      if (name === "bookings") {
        return {
          doc() {
            return bookingRef;
          },
        };
      }
      if (name === "users") {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: Boolean(options.actorRole),
                  data: () => (options.actorRole ? { role: options.actorRole } : null),
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    async runTransaction(
      fn: (tx: {
        get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
        update: (ref: unknown, data: Record<string, unknown>) => void;
      }) => Promise<unknown>,
    ) {
      return fn({
        get: (ref) => ref.get(),
        update(_ref, data) {
          updates.push(data);
          if (booking) {
            booking = { ...booking, ...data };
          }
        },
      });
    },
  };

  return { db, updates };
}

describe("assertCanCompleteLesson", () => {
  it("allows the booking tutor to complete a confirmed paid lesson after the scheduled time", () => {
    expect(() =>
      assertCanCompleteLesson({
        actorUid: "tutor-1",
        booking: CONFIRMED_PAID,
        now: NOW,
      }),
    ).not.toThrow();
  });

  it("allows an admin to complete a confirmed paid lesson", () => {
    expect(() =>
      assertCanCompleteLesson({
        actorUid: "admin-1",
        actorRole: "admin",
        booking: CONFIRMED_PAID,
        now: NOW,
      }),
    ).not.toThrow();
  });

  it("rejects an unauthenticated request", () => {
    expect(() =>
      assertCanCompleteLesson({
        actorUid: "",
        booking: CONFIRMED_PAID,
        now: NOW,
      }),
    ).toThrow(/Faça login/);
  });

  it("rejects a student, including the student on the booking", () => {
    expect(() =>
      assertCanCompleteLesson({
        actorUid: "student-1",
        actorRole: "student",
        booking: CONFIRMED_PAID,
        now: NOW,
      }),
    ).toThrow(/professor desta aula/);
  });

  it("rejects another tutor", () => {
    expect(() =>
      assertCanCompleteLesson({
        actorUid: "tutor-2",
        actorRole: "tutor",
        booking: CONFIRMED_PAID,
        now: NOW,
      }),
    ).toThrow(/professor desta aula/);
  });

  it("rejects pending → completed", () => {
    expect(() =>
      assertCanCompleteLesson({
        actorUid: "tutor-1",
        booking: { ...CONFIRMED_PAID, status: "pending" },
        now: NOW,
      }),
    ).toThrow(/aula confirmada/);
  });

  it("rejects cancelled → completed", () => {
    expect(() =>
      assertCanCompleteLesson({
        actorUid: "tutor-1",
        booking: { ...CONFIRMED_PAID, status: "cancelled" },
        now: NOW,
      }),
    ).toThrow(/aula cancelada/);
  });

  it("rejects unpaid → completed", () => {
    expect(() =>
      assertCanCompleteLesson({
        actorUid: "tutor-1",
        booking: { ...CONFIRMED_PAID, paymentStatus: "unpaid" },
        now: NOW,
      }),
    ).toThrow(/aula paga/);
  });

  it("rejects a lesson that is already completed", () => {
    expect(() =>
      assertCanCompleteLesson({
        actorUid: "tutor-1",
        booking: { ...CONFIRMED_PAID, status: "completed" },
        now: NOW,
      }),
    ).toThrow(/já foi concluída/);
  });

  it("rejects a tutor completing before the scheduled time", () => {
    expect(() =>
      assertCanCompleteLesson({
        actorUid: "tutor-1",
        booking: { ...CONFIRMED_PAID, scheduledAt: FUTURE },
        now: NOW,
      }),
    ).toThrow(/após o horário agendado/);
  });
});

describe("completeLessonForActor", () => {
  it("writes status completed and completedAt for a valid tutor transition", async () => {
    const { db, updates } = createFakeDb();
    const result = await completeLessonForActor(
      db,
      { actorUid: "tutor-1", bookingId: "booking-1" },
      { timestamp: "TS", now: NOW },
    );

    expect(result).toEqual({ bookingId: "booking-1", status: "completed" });
    expect(updates).toEqual([
      { status: "completed", completedAt: "TS", updatedAt: "TS" },
    ]);
  });

  it("lets an admin complete another tutor's confirmed paid lesson", async () => {
    const { db, updates } = createFakeDb({ actorRole: "admin" });
    await completeLessonForActor(
      db,
      { actorUid: "admin-1", bookingId: "booking-1", actorRole: "admin" },
      { timestamp: "TS", now: NOW },
    );
    expect(updates[0]?.status).toBe("completed");
    expect(updates[0]?.completedAt).toBe("TS");
  });

  it("does not write when a student tries to complete the booking", async () => {
    const { db, updates } = createFakeDb({ actorRole: "student" });
    await expect(
      completeLessonForActor(db, {
        actorUid: "student-1",
        bookingId: "booking-1",
        actorRole: "student",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updates).toHaveLength(0);
  });

  it("does not write pending, cancelled, or unpaid transitions", async () => {
    for (const booking of [
      { ...CONFIRMED_PAID, status: "pending" },
      { ...CONFIRMED_PAID, status: "cancelled" },
      { ...CONFIRMED_PAID, paymentStatus: "unpaid" },
    ]) {
      const { db, updates } = createFakeDb({ booking });
      await expect(
        completeLessonForActor(
          db,
          { actorUid: "tutor-1", bookingId: "booking-1" },
          { now: NOW },
        ),
      ).rejects.toBeInstanceOf(Error);
      expect(updates).toHaveLength(0);
    }
  });
});

describe("canTutorMarkCompleted and student copy", () => {
  it("enables the tutor action only for a confirmed paid lesson after the schedule", () => {
    expect(canTutorMarkCompleted(CONFIRMED_PAID, NOW)).toBe(true);
    expect(canTutorMarkCompleted({ ...CONFIRMED_PAID, paymentStatus: "unpaid" }, NOW)).toBe(
      false,
    );
    expect(canTutorMarkCompleted({ ...CONFIRMED_PAID, scheduledAt: FUTURE }, NOW)).toBe(false);
  });

  it("explains the completed status to the student in Brazilian Portuguese", () => {
    expect(studentCompletedLessonCopy("completed", false)).toBe(
      "Aula concluída. Você já pode avaliar o professor.",
    );
    expect(studentCompletedLessonCopy("completed", true)).toBe("Aula concluída.");
    expect(studentCompletedLessonCopy("confirmed", false)).toBeNull();
  });
});
