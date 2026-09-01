import { describe, expect, it } from "vitest";
import {
  JOIN_AND_BOOK_ERRORS,
  createCollectiveBookingForStudent,
} from "@/lib/hubs/join-and-book";

const HUB_ID = "hub-1";
const TUTOR_ID = "tutor-1";

function openHub(overrides: Record<string, unknown> = {}) {
  return {
    tutorId: TUTOR_ID,
    title: "Inglês para Viagem",
    maxStudents: 6,
    confirmedStudentIds: [],
    confirmedStudentCount: 0,
    currentPrice: 28,
    status: "open",
    scheduledDate: "2026-09-08",
    startTime: "19:00",
    ...overrides,
  };
}

function createMemoryJoinStore(seed: {
  users?: Record<string, Record<string, unknown>>;
  hubs?: Record<string, Record<string, unknown>>;
} = {}) {
  const users = { ...(seed.users ?? {}) };
  const hubs = { ...(seed.hubs ?? {}) };
  const bookings = new Map<string, Record<string, unknown>>();
  let seq = 0;
  let queue = Promise.resolve();

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

      if (name === "collectiveHubs") {
        return {
          doc(id: string) {
            return {
              id,
              path: `collectiveHubs/${id}`,
              async get() {
                const data = hubs[id];
                return { exists: Boolean(data), id, data: () => data };
              },
            };
          },
        };
      }

      if (name === "bookings") {
        return {
          doc(id?: string) {
            const bookingId = id || `booking-${++seq}`;
            return {
              id: bookingId,
              path: `bookings/${bookingId}`,
            };
          },
        };
      }

      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction(
      fn: (tx: {
        get: (target: { get: () => Promise<unknown> }) => Promise<unknown>;
        set: (ref: { id: string; path: string }, data: Record<string, unknown>) => void;
        update: (ref: { id: string; path: string }, data: Record<string, unknown>) => void;
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
              bookings.set(ref.id, { id: ref.id, ...data });
            });
          },
          update(ref, data) {
            writes.push(() => {
              if (ref.path.startsWith("collectiveHubs/")) {
                hubs[ref.id] = { ...hubs[ref.id], ...data };
              }
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

  return { db, bookings, hubs };
}

describe("createCollectiveBookingForStudent", () => {
  const deps = { now: new Date("2026-08-31T12:00:00.000Z"), timestamp: new Date("2026-08-31T12:00:00.000Z") };

  it("stores hub.currentPrice and ignores a client-supplied price", async () => {
    const store = createMemoryJoinStore({
      users: { "student-a": { role: "student" } },
      hubs: { [HUB_ID]: openHub() },
    });

    const result = await createCollectiveBookingForStudent(
      store.db,
      {
        actorUid: "student-a",
        hubId: HUB_ID,
        tutorId: "someone-else",
        price: 1,
        platformFee: 0,
        tutorAmount: 1,
      },
      deps,
    );

    expect(result.price).toBe(28);
    expect(store.bookings.get(result.bookingId)).toMatchObject({
      studentId: "student-a",
      tutorId: TUTOR_ID,
      type: "coletivo",
      price: 28,
      platformFee: 2.8,
      tutorAmount: 25.2,
      hubId: HUB_ID,
    });
    expect(store.hubs[HUB_ID]?.confirmedStudentIds).toEqual(["student-a"]);
  });

  it("rejects a join when the hub has no valid currentPrice", async () => {
    const store = createMemoryJoinStore({
      users: { "student-a": { role: "student" } },
      hubs: { [HUB_ID]: openHub({ currentPrice: 0 }) },
    });

    await expect(
      createCollectiveBookingForStudent(
        store.db,
        { actorUid: "student-a", hubId: HUB_ID, price: 28 },
        deps,
      ),
    ).rejects.toMatchObject({
      code: "INVALID_PRICE",
      message: JOIN_AND_BOOK_ERRORS.INVALID_PRICE,
    });
    expect(store.bookings.size).toBe(0);
  });

  it("rejects an unauthenticated join", async () => {
    const store = createMemoryJoinStore({
      hubs: { [HUB_ID]: openHub() },
    });

    await expect(
      createCollectiveBookingForStudent(store.db, { hubId: HUB_ID }, deps),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      message: JOIN_AND_BOOK_ERRORS.UNAUTHENTICATED,
    });
    expect(store.bookings.size).toBe(0);
  });

  it("rejects a tutor trying to join as a student", async () => {
    const store = createMemoryJoinStore({
      users: { "tutor-1": { role: "tutor" } },
      hubs: { [HUB_ID]: openHub() },
    });

    await expect(
      createCollectiveBookingForStudent(
        store.db,
        { actorUid: "tutor-1", hubId: HUB_ID },
        deps,
      ),
    ).rejects.toMatchObject({
      code: "FORBIDDEN_ROLE",
    });
    expect(store.bookings.size).toBe(0);
  });
});
