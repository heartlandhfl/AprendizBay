import { describe, expect, it } from "vitest";
import { buildAdminOperationsDashboard } from "@/lib/admin/dashboard";

interface MemoryDoc {
  id: string;
  [key: string]: unknown;
}

function createMemoryDb(collections: Record<string, MemoryDoc[]>) {
  function matches(doc: MemoryDoc, filters: Array<[string, string, unknown]>) {
    return filters.every(([field, op, value]) => {
      if (op === "==") {
        return doc[field] === value;
      }
      return true;
    });
  }

  return {
    collection(name: string) {
      const docs = collections[name] ?? [];
      const state: {
        filters: Array<[string, string, unknown]>;
        order?: { field: string; direction: string };
        limitTo?: number;
      } = { filters: [] };

      const query = {
        where(field: string, op: string, value: unknown) {
          state.filters.push([field, op, value]);
          return query;
        },
        orderBy(field: string, direction = "asc") {
          state.order = { field, direction };
          return query;
        },
        limit(count: number) {
          state.limitTo = count;
          return query;
        },
        select() {
          return query;
        },
        count() {
          return {
            async get() {
              return {
                data: () => ({
                  count: docs.filter((doc) => matches(doc, state.filters)).length,
                }),
              };
            },
          };
        },
        async get() {
          let rows = docs.filter((doc) => matches(doc, state.filters));
          if (state.order) {
            const { field, direction } = state.order;
            rows = [...rows].sort((left, right) => {
              const leftValue = String(left[field] ?? "");
              const rightValue = String(right[field] ?? "");
              return direction === "desc"
                ? rightValue.localeCompare(leftValue)
                : leftValue.localeCompare(rightValue);
            });
          }
          if (state.limitTo != null) {
            rows = rows.slice(0, state.limitTo);
          }
          return {
            docs: rows.map((row) => ({
              id: row.id,
              data: () =>
                Object.fromEntries(Object.entries(row).filter(([key]) => key !== "id")),
            })),
          };
        },
      };

      return query;
    },
  };
}

describe("buildAdminOperationsDashboard", () => {
  it("aggregates real collection data without fabricating reported reviews", async () => {
    const dashboard = await buildAdminOperationsDashboard({
      db: createMemoryDb({
        users: [
          { id: "s1", role: "student" },
          { id: "s2", role: "student" },
          { id: "t1", role: "tutor" },
          { id: "a1", role: "admin" },
        ],
        tutors: [
          { id: "t1", verificationStatus: "pending", isVerified: false },
          { id: "t2", verificationStatus: "approved", isVerified: true },
          { id: "t3", verificationStatus: "suspended", isVerified: false },
        ],
        bookings: [
          { id: "b1", status: "pending", paymentStatus: "unpaid", price: 70 },
          {
            id: "b2",
            status: "confirmed",
            paymentStatus: "awaiting_payment",
            price: 80,
          },
          {
            id: "b3",
            status: "completed",
            paymentStatus: "paid",
            price: 100,
            platformFee: 10,
            tutorAmount: 90,
          },
          {
            id: "b4",
            status: "cancelled",
            paymentStatus: "paid",
            price: 50,
            platformFee: 5,
            tutorAmount: 45,
            refundId: "ref_1",
            refundStatus: "REFUNDED",
            refundAmount: 50,
          },
        ],
        reviews: [
          {
            id: "b3",
            tutorId: "t2",
            studentId: "s1",
            bookingId: "b3",
            rating: 5,
            comment: "Excelente.",
            createdAt: "2026-08-20T12:00:00.000Z",
          },
        ],
      }),
    });

    expect(dashboard.overview.students).toEqual({ available: true, value: 2 });
    expect(dashboard.overview.tutors).toEqual({ available: true, value: 1 });
    expect(dashboard.overview.pendingTutors).toEqual({ available: true, value: 1 });
    expect(dashboard.overview.pendingBookings).toEqual({ available: true, value: 1 });
    expect(dashboard.overview.confirmedBookings).toEqual({ available: true, value: 1 });
    expect(dashboard.overview.completedBookings).toEqual({ available: true, value: 1 });
    expect(dashboard.overview.awaitingPayments).toEqual({ available: true, value: 1 });
    expect(dashboard.overview.completedPayments).toEqual({ available: true, value: 2 });
    expect(dashboard.overview.cancellations).toEqual({ available: true, value: 1 });
    expect(dashboard.overview.refunds).toEqual({ available: true, value: 1 });
    expect(dashboard.tutors).toEqual({
      pending: { available: true, value: 1 },
      approved: { available: true, value: 1 },
      changesRequested: { available: true, value: 0 },
      rejected: { available: true, value: 0 },
      suspended: { available: true, value: 1 },
    });
    expect(dashboard.bookings.awaitingPayment).toEqual({ available: true, value: 1 });
    expect(dashboard.payments).toEqual({
      gross: { available: true, value: 150 },
      platformFees: { available: true, value: 15 },
      tutorAmount: { available: true, value: 135 },
      refunds: { available: true, value: 50 },
    });
    expect(dashboard.reviews.recent).toHaveLength(1);
    expect(dashboard.reviews.recent[0]?.comment).toBe("Excelente.");
    expect(dashboard.reviews.reported).toEqual({ available: false });
    expect(dashboard.users.suspendedAccounts).toEqual({ available: true, value: 1 });
  });

  it("marks a failed collection query as Indisponível instead of inventing a number", async () => {
    const db = createMemoryDb({
      users: [{ id: "s1", role: "student" }],
      tutors: [],
      bookings: [],
      reviews: [],
    });
    const originalCollection = db.collection.bind(db);
    db.collection = (name: string) => {
      if (name === "bookings") {
        throw new Error("missing index");
      }
      return originalCollection(name);
    };

    const dashboard = await buildAdminOperationsDashboard({ db });

    expect(dashboard.overview.students).toEqual({ available: true, value: 1 });
    expect(dashboard.overview.pendingBookings).toEqual({ available: false });
    expect(dashboard.payments.gross).toEqual({ available: false });
    expect(dashboard.reviews.reported).toEqual({ available: false });
  });
});
