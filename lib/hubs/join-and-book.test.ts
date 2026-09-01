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
  const participants = new Map<string, Record<string, unknown>>();
  const bookings = new Map<string, Record<string, unknown>>();
  let seq = 0;
  let queue = Promise.resolve();

  function hubDoc(id: string) {
    return {
      id,
      path: `collectiveHubs/${id}`,
      async get() {
        const data = hubs[id];
        return { exists: Boolean(data), id, data: () => data };
      },
      collection(subName: string) {
        if (subName !== "participants") {
          throw new Error(`unexpected subcollection ${subName}`);
        }
        return {
          doc(studentId: string) {
            const path = `collectiveHubs/${id}/participants/${studentId}`;
            return {
              id: studentId,
              path,
              async get() {
                const data = participants.get(path);
                return { exists: Boolean(data), id: studentId, data: () => data };
              },
            };
          },
        };
      },
    };
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

      if (name === "collectiveHubs") {
        return {
          doc: hubDoc,
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
              if (ref.path.includes("/participants/")) {
                participants.set(ref.path, { id: ref.id, ...data });
                return;
              }
              bookings.set(ref.id, { id: ref.id, ...data });
            });
          },
          update(ref, data) {
            writes.push(() => {
              if (ref.path.startsWith("collectiveHubs/") && !ref.path.includes("/participants/")) {
                const next = { ...hubs[ref.id], ...data };
                if (data.confirmedStudentIds && typeof data.confirmedStudentIds === "object") {
                  delete next.confirmedStudentIds;
                }
                hubs[ref.id] = next;
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

  return { db, bookings, hubs, participants };
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
    expect(store.hubs[HUB_ID]?.confirmedStudentCount).toBe(1);
    expect(store.hubs[HUB_ID]).not.toHaveProperty("confirmedStudentIds");
    expect(store.participants.get(`collectiveHubs/${HUB_ID}/participants/student-a`)).toMatchObject({
      studentId: "student-a",
    });
  });

  it("rejects a second join from the same student using the private roster", async () => {
    const store = createMemoryJoinStore({
      users: { "student-a": { role: "student" } },
      hubs: { [HUB_ID]: openHub({ confirmedStudentCount: 1 }) },
    });
    store.participants.set(`collectiveHubs/${HUB_ID}/participants/student-a`, {
      studentId: "student-a",
    });

    await expect(
      createCollectiveBookingForStudent(
        store.db,
        { actorUid: "student-a", hubId: HUB_ID },
        deps,
      ),
    ).rejects.toMatchObject({ code: "already_joined" });
    expect(store.bookings.size).toBe(0);
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
