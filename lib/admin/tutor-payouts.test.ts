import { describe, expect, it } from "vitest";
import {
  ADMIN_PAYOUT_ERRORS,
  listAdminTutorPayouts,
  markTutorPayoutPaid,
} from "@/lib/admin/tutor-payouts";
import { TUTOR_PAYOUTS_COLLECTION } from "@/lib/payments/ledger/schema";

function createMemoryDb(seed: Record<string, Record<string, Record<string, unknown>>> = {}) {
  const collections = new Map<string, Map<string, Record<string, unknown>>>(
    Object.entries(seed).map(([name, docs]) => [name, new Map(Object.entries(docs))]),
  );

  function collection(name: string) {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }
    const docs = collections.get(name)!;

    return {
      doc(id: string) {
        return {
          async get() {
            const data = docs.get(id);
            return {
              exists: data != null,
              id,
              data: () => data,
            };
          },
          set(data: Record<string, unknown>, options?: { merge?: boolean }) {
            const current = docs.get(id) ?? {};
            docs.set(id, options?.merge ? { ...current, ...data } : data);
          },
          update(data: Record<string, unknown>) {
            const current = docs.get(id) ?? {};
            docs.set(id, { ...current, ...data });
          },
        };
      },
      where(field: string, _op: string, value: unknown) {
        return {
          async get() {
            const matches = [...docs.entries()]
              .filter(([, data]) => data[field] === value)
              .map(([docId, data]) => ({
                id: docId,
                data: () => data,
              }));
            return {
              docs: matches,
              empty: matches.length === 0,
            };
          },
        };
      },
    };
  }

  return {
    collection,
    runTransaction<T>(work: (transaction: {
      get: (ref: { get: () => Promise<{ exists: boolean; data: () => unknown }> }) => Promise<{
        exists: boolean;
        data: () => unknown;
      }>;
      update: (ref: { update: (data: Record<string, unknown>) => void }, data: Record<string, unknown>) => void;
    }) => Promise<T>): Promise<T> {
      const transaction = {
        async get(ref: { get: () => Promise<{ exists: boolean; data: () => unknown }> }) {
          return ref.get();
        },
        update(
          ref: { update: (data: Record<string, unknown>) => void },
          data: Record<string, unknown>,
        ) {
          ref.update(data);
        },
      };
      return work(transaction);
    },
  };
}

describe("admin tutor payouts", () => {
  it("lists pending payouts", async () => {
    const db = createMemoryDb({
      [TUTOR_PAYOUTS_COLLECTION]: {
        payout_1: {
          tutorId: "tutor-1",
          bookingId: "booking-1",
          amount: 90,
          status: "pending",
          paymentIds: ["mercadopago_1"],
          createdAt: new Date("2026-09-08T20:00:00Z"),
        },
        payout_2: {
          tutorId: "tutor-2",
          bookingId: "booking-2",
          amount: 50,
          status: "paid",
          paymentIds: ["mercadopago_2"],
        },
      },
      tutors: {
        "tutor-1": { name: "Ana Professora" },
      },
    });

    const payouts = await listAdminTutorPayouts(db as never, "pending");
    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toMatchObject({
      payoutId: "payout_1",
      tutorName: "Ana Professora",
      bookingId: "booking-1",
      amount: 90,
      status: "pending",
    });
  });

  it("marks a pending payout as paid", async () => {
    const db = createMemoryDb({
      [TUTOR_PAYOUTS_COLLECTION]: {
        payout_1: {
          tutorId: "tutor-1",
          bookingId: "booking-1",
          amount: 90,
          status: "pending",
          paymentIds: ["mercadopago_1"],
        },
      },
      tutors: {
        "tutor-1": { name: "Ana Professora" },
      },
    });

    const payout = await markTutorPayoutPaid(db as never, "payout_1");
    expect(payout.status).toBe("paid");
    expect(payout.paidAt).toBeTruthy();
  });

  it("rejects marking a non-pending payout as paid", async () => {
    const db = createMemoryDb({
      [TUTOR_PAYOUTS_COLLECTION]: {
        payout_1: {
          tutorId: "tutor-1",
          bookingId: "booking-1",
          amount: 90,
          status: "paid",
          paymentIds: ["mercadopago_1"],
        },
      },
    });

    await expect(markTutorPayoutPaid(db as never, "payout_1")).rejects.toThrow(
      ADMIN_PAYOUT_ERRORS.notPending,
    );
  });
});
