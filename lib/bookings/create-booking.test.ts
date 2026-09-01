import { describe, expect, it } from "vitest";
import {
  CREATE_BOOKING_ERRORS,
  assertCanCreateIndividualBooking,
  createIndividualBookingForStudent,
  evaluateIndividualSlotClaim,
  individualLessonSlotKey,
  simulateConcurrentIndividualBookings,
} from "./create-booking";

const SLOT = new Date("2026-09-08T19:00:00.000Z");
const NOW = new Date("2026-08-31T12:00:00.000Z");
const TUTOR_ID = "tutor-1";

function approvedTutor() {
  return {
    userId: TUTOR_ID,
    name: "Mariana",
    isVerified: true,
    verificationStatus: "approved",
    individualPrice: 70,
  };
}

function weeklyMatching(date: Date) {
  const startMinutes = date.getHours() * 60 + date.getMinutes();
  const endMinutes = startMinutes + 60;
  return {
    slots: [
      {
        weekday: date.getDay(),
        startTime: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
        endTime: `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`,
      },
    ],
  };
}

function createMemoryCreateStore(
  seed: {
    users?: Record<string, Record<string, unknown>>;
    tutors?: Record<string, Record<string, unknown>>;
    availability?: Record<string, Record<string, unknown>>;
    bookings?: Array<Record<string, unknown> & { id: string }>;
    slots?: Record<string, Record<string, unknown>>;
  } = {},
) {
  const users = { ...(seed.users ?? {}) };
  const tutors = { ...(seed.tutors ?? {}) };
  const availability = { ...(seed.availability ?? {}) };
  const bookings = new Map(
    (seed.bookings ?? []).map((booking) => [booking.id, { ...booking }]),
  );
  const slots = { ...(seed.slots ?? {}) };
  let seq = 0;
  let queue = Promise.resolve();

  function occupancyDocs() {
    return [...bookings.values()].filter(
      (booking) => booking.status === "pending" || booking.status === "confirmed",
    );
  }

  const db = {
    collection(name: string) {
      if (name === "users") {
        return {
          doc(id: string) {
            return {
              async get() {
                const data = users[id];
                return { exists: Boolean(data), data: () => data };
              },
            };
          },
        };
      }

      if (name === "tutors") {
        return {
          doc(id: string) {
            return {
              async get() {
                const data = tutors[id];
                return { exists: Boolean(data), data: () => data };
              },
              collection(subName: string) {
                if (subName !== "availability") {
                  throw new Error(`unexpected subcollection ${subName}`);
                }
                return {
                  doc(docId: string) {
                    return {
                      async get() {
                        const data = availability[`${id}/${docId}`];
                        return { exists: Boolean(data), data: () => data };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (name === "lessonSlots") {
        return {
          doc(id: string) {
            return {
              id,
              path: `lessonSlots/${id}`,
              async get() {
                const data = slots[id];
                return { exists: Boolean(data), id, data: () => data };
              },
            };
          },
        };
      }

      if (name === "bookings") {
        const query = {
          where() {
            return query;
          },
          select() {
            return query;
          },
          async get() {
            return {
              docs: occupancyDocs().map((data) => ({
                id: String(data.id),
                data: () => data,
              })),
            };
          },
          doc(id?: string) {
            const bookingId = id || `booking-${++seq}`;
            return {
              id: bookingId,
              path: `bookings/${bookingId}`,
              async get() {
                const data = bookings.get(bookingId);
                return { exists: Boolean(data), id: bookingId, data: () => data };
              },
            };
          },
        };
        return query;
      }

      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction(
      fn: (tx: {
        get: (target: { get: () => Promise<unknown> }) => Promise<unknown>;
        set: (ref: { id: string; path: string }, data: Record<string, unknown>) => void;
      }) => Promise<unknown>,
    ) {
      const run = queue.then(async () => {
        const writes: Array<() => void> = [];
        const result = await fn({
          get(target) {
            return target.get();
          },
          set(ref, data) {
            writes.push(() => {
              if (ref.path.startsWith("lessonSlots/")) {
                slots[ref.id] = { ...data };
                return;
              }
              bookings.set(ref.id, { id: ref.id, ...data });
            });
          },
        });
        for (const write of writes) {
          write();
        }
        return result;
      });
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };

  return { db, bookings, slots };
}

describe("individualLessonSlotKey", () => {
  it("is tutor + scheduledAt in UTC ISO", () => {
    expect(individualLessonSlotKey(TUTOR_ID, SLOT)).toBe(
      "tutor-1_2026-09-08T19:00:00.000Z",
    );
  });
});

describe("evaluateIndividualSlotClaim", () => {
  it("accepts a free individual slot", () => {
    expect(
      evaluateIndividualSlotClaim({
        tutorId: TUTOR_ID,
        scheduledAt: SLOT,
        occupiedStarts: [],
      }),
    ).toEqual({
      ok: true,
      slotKey: "tutor-1_2026-09-08T19:00:00.000Z",
    });
  });

  it("rejects a slot already held by a pending or confirmed lesson", () => {
    const decision = evaluateIndividualSlotClaim({
      tutorId: TUTOR_ID,
      scheduledAt: SLOT,
      occupiedStarts: ["2026-09-08T19:00:00.000Z"],
    });

    expect(decision).toMatchObject({
      ok: false,
      code: "SLOT_TAKEN",
      message: CREATE_BOOKING_ERRORS.SLOT_TAKEN,
    });
  });
});

describe("simulateConcurrentIndividualBookings", () => {
  it("lets only the first of two students keep tutor+scheduledAt", () => {
    const { occupiedStarts, results } = simulateConcurrentIndividualBookings([], [
      { studentId: "student-a", tutorId: TUTOR_ID, scheduledAt: SLOT },
      { studentId: "student-b", tutorId: TUTOR_ID, scheduledAt: SLOT },
    ]);

    expect(results[0]).toMatchObject({
      studentId: "student-a",
      ok: true,
      slotKey: "tutor-1_2026-09-08T19:00:00.000Z",
    });
    expect(results[1]).toMatchObject({
      studentId: "student-b",
      ok: false,
      code: "SLOT_TAKEN",
      message: CREATE_BOOKING_ERRORS.SLOT_TAKEN,
    });
    expect(occupiedStarts).toEqual(["2026-09-08T19:00:00.000Z"]);
  });
});

describe("assertCanCreateIndividualBooking", () => {
  it("rejects collective bookings on the individual path", () => {
    expect(() =>
      assertCanCreateIndividualBooking({
        actorUid: "student-1",
        tutorId: TUTOR_ID,
        type: "coletivo",
        scheduledAt: SLOT,
        price: 70,
      }),
    ).toThrow(CREATE_BOOKING_ERRORS.COLLECTIVE_PATH);
  });

  it("rejects a past slot", () => {
    expect(() =>
      assertCanCreateIndividualBooking(
        {
          actorUid: "student-1",
          tutorId: TUTOR_ID,
          scheduledAt: new Date("2026-08-01T19:00:00.000Z"),
          price: 70,
        },
        NOW,
      ),
    ).toThrow(CREATE_BOOKING_ERRORS.SLOT_IN_PAST);
  });
});

describe("createIndividualBookingForStudent", () => {
  const deps = { now: NOW, timestamp: NOW };

  function seededStore(
    extras: {
      bookings?: Array<Record<string, unknown> & { id: string }>;
    } = {},
  ) {
    return createMemoryCreateStore({
      users: {
        "student-a": { role: "student" },
        "student-b": { role: "student" },
      },
      tutors: { [TUTOR_ID]: approvedTutor() },
      availability: { [`${TUTOR_ID}/weekly`]: weeklyMatching(SLOT) },
      bookings: extras.bookings,
    });
  }

  it("commits the first booking and rejects the second for the same tutor/time", async () => {
    const store = seededStore();

    const first = await createIndividualBookingForStudent(
      store.db,
      {
        actorUid: "student-a",
        tutorId: TUTOR_ID,
        scheduledAt: SLOT,
        price: 70,
      },
      deps,
    );

    await expect(
      createIndividualBookingForStudent(
        store.db,
        {
          actorUid: "student-b",
          tutorId: TUTOR_ID,
          scheduledAt: SLOT,
          price: 70,
        },
        deps,
      ),
    ).rejects.toMatchObject({
      code: "SLOT_TAKEN",
      message: CREATE_BOOKING_ERRORS.SLOT_TAKEN,
      httpStatus: 409,
    });

    expect(first.slotKey).toBe("tutor-1_2026-09-08T19:00:00.000Z");
    expect(store.bookings.size).toBe(1);
    expect(store.bookings.get(first.bookingId)).toMatchObject({
      studentId: "student-a",
      tutorId: TUTOR_ID,
      type: "individual",
      status: "pending",
      slotKey: first.slotKey,
    });
    expect(store.slots[first.slotKey]).toMatchObject({
      bookingId: first.bookingId,
      status: "held",
    });
  });

  it("rejects the loser when two creates race for the same tutor/time", async () => {
    const store = seededStore();
    const input = {
      tutorId: TUTOR_ID,
      scheduledAt: SLOT,
      price: 70,
    };

    const results = await Promise.allSettled([
      createIndividualBookingForStudent(
        store.db,
        { ...input, actorUid: "student-a" },
        deps,
      ),
      createIndividualBookingForStudent(
        store.db,
        { ...input, actorUid: "student-b" },
        deps,
      ),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({
        code: "SLOT_TAKEN",
        message: CREATE_BOOKING_ERRORS.SLOT_TAKEN,
      }),
    });
    expect(store.bookings.size).toBe(1);
  });

  it("releases the slot after a cancellation so another student can book", async () => {
    const store = seededStore({
      bookings: [
        {
          id: "cancelled-1",
          studentId: "student-a",
          tutorId: TUTOR_ID,
          type: "individual",
          status: "cancelled",
          scheduledAt: SLOT,
        },
      ],
    });

    const result = await createIndividualBookingForStudent(
      store.db,
      {
        actorUid: "student-b",
        tutorId: TUTOR_ID,
        scheduledAt: SLOT,
        price: 70,
      },
      deps,
    );

    expect(result.bookingId).toBeTruthy();
    expect(store.bookings.get("cancelled-1")).toMatchObject({ status: "cancelled" });
    expect(store.bookings.get(result.bookingId)).toMatchObject({
      studentId: "student-b",
      status: "pending",
    });
  });

  it("keeps a completed historical booking and does not treat it as occupying", async () => {
    const historical = {
      id: "completed-1",
      studentId: "student-a",
      tutorId: TUTOR_ID,
      type: "individual" as const,
      status: "completed",
      scheduledAt: new Date("2026-08-01T19:00:00.000Z"),
      completedAt: new Date("2026-08-01T20:00:00.000Z"),
    };
    const store = seededStore({ bookings: [historical] });

    const result = await createIndividualBookingForStudent(
      store.db,
      {
        actorUid: "student-b",
        tutorId: TUTOR_ID,
        scheduledAt: SLOT,
        price: 70,
      },
      deps,
    );

    expect(store.bookings.get("completed-1")).toEqual(historical);
    expect(store.bookings.get(result.bookingId)).toMatchObject({
      studentId: "student-b",
      status: "pending",
      scheduledAt: SLOT,
    });
  });

  it("rejects an individual booking when a collective class already occupies the tutor/time", async () => {
    const store = seededStore({
      bookings: [
        {
          id: "collective-1",
          studentId: "student-a",
          tutorId: TUTOR_ID,
          type: "coletivo",
          status: "pending",
          scheduledAt: SLOT,
        },
      ],
    });

    await expect(
      createIndividualBookingForStudent(
        store.db,
        {
          actorUid: "student-b",
          tutorId: TUTOR_ID,
          scheduledAt: SLOT,
          price: 70,
        },
        deps,
      ),
    ).rejects.toMatchObject({
      code: "SLOT_TAKEN",
      message: CREATE_BOOKING_ERRORS.SLOT_TAKEN,
    });

    expect(store.bookings.get("collective-1")).toMatchObject({
      type: "coletivo",
      status: "pending",
    });
  });

  it("stores the tutor individualPrice and ignores a client-supplied price and fee split", async () => {
    const store = seededStore();

    const result = await createIndividualBookingForStudent(
      store.db,
      {
        actorUid: "student-a",
        tutorId: TUTOR_ID,
        scheduledAt: SLOT,
        price: 1,
        platformFee: 0,
        tutorAmount: 1,
      },
      deps,
    );

    expect(store.bookings.get(result.bookingId)).toMatchObject({
      price: 70,
      platformFee: 7,
      tutorAmount: 63,
    });
  });

  it("rejects a booking when the tutor has no valid individualPrice", async () => {
    const store = createMemoryCreateStore({
      users: { "student-a": { role: "student" } },
      tutors: {
        [TUTOR_ID]: {
          userId: TUTOR_ID,
          isVerified: true,
          verificationStatus: "approved",
        },
      },
      availability: { [`${TUTOR_ID}/weekly`]: weeklyMatching(SLOT) },
    });

    await expect(
      createIndividualBookingForStudent(
        store.db,
        {
          actorUid: "student-a",
          tutorId: TUTOR_ID,
          scheduledAt: SLOT,
          price: 70,
        },
        deps,
      ),
    ).rejects.toMatchObject({
      code: "INVALID_PRICE",
      message: CREATE_BOOKING_ERRORS.INVALID_PRICE,
    });
    expect(store.bookings.size).toBe(0);
  });

  it("rejects a slot that is not in the tutor weekly availability", async () => {
    const store = seededStore();
    const unoffered = new Date(SLOT);
    unoffered.setHours((SLOT.getHours() + 6) % 24, 0, 0, 0);

    await expect(
      createIndividualBookingForStudent(
        store.db,
        {
          actorUid: "student-a",
          tutorId: TUTOR_ID,
          scheduledAt: unoffered,
          price: 70,
        },
        deps,
      ),
    ).rejects.toMatchObject({
      code: "SLOT_NOT_OFFERED",
      message: CREATE_BOOKING_ERRORS.SLOT_NOT_OFFERED,
    });
    expect(store.bookings.size).toBe(0);
  });

  it("rejects a create when lessonSlots already holds the tutor/time", async () => {
    const slotKey = `tutor-1_${SLOT.toISOString()}`;
    const store = createMemoryCreateStore({
      users: { "student-b": { role: "student" } },
      tutors: { [TUTOR_ID]: approvedTutor() },
      availability: { [`${TUTOR_ID}/weekly`]: weeklyMatching(SLOT) },
      bookings: [
        {
          id: "held-booking",
          studentId: "student-a",
          tutorId: TUTOR_ID,
          type: "individual",
          status: "pending",
          scheduledAt: SLOT,
        },
      ],
      slots: {
        [slotKey]: {
          tutorId: TUTOR_ID,
          bookingId: "held-booking",
          status: "held",
        },
      },
    });

    await expect(
      createIndividualBookingForStudent(
        store.db,
        {
          actorUid: "student-b",
          tutorId: TUTOR_ID,
          scheduledAt: SLOT,
          studentId: "student-b",
          status: "confirmed",
          paymentStatus: "paid",
          price: 1,
        },
        deps,
      ),
    ).rejects.toMatchObject({
      code: "SLOT_TAKEN",
      message: CREATE_BOOKING_ERRORS.SLOT_TAKEN,
    });
    expect(store.bookings.size).toBe(1);
  });

  it("uses the authenticated student id and ignores a client-supplied studentId or status", async () => {
    const store = seededStore();

    const result = await createIndividualBookingForStudent(
      store.db,
      {
        actorUid: "student-a",
        tutorId: TUTOR_ID,
        scheduledAt: SLOT,
        studentId: "attacker",
        tutorIdFromClient: "other-tutor",
        status: "confirmed",
        paymentStatus: "paid",
        isVerified: true,
      },
      deps,
    );

    expect(store.bookings.get(result.bookingId)).toMatchObject({
      studentId: "student-a",
      tutorId: TUTOR_ID,
      status: "pending",
      paymentStatus: "unpaid",
    });
  });
});
