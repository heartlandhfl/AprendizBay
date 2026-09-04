import { describe, expect, it } from "vitest";
import {
  ACCEPT_ERROR_STATUS,
  acceptBookingForTutor,
  assertCanAcceptBooking,
} from "./accept-booking";

const PENDING_UNPAID = {
  studentId: "student-1",
  tutorId: "tutor-1",
  status: "pending",
  paymentStatus: "unpaid",
  price: 80,
  scheduledAt: new Date("2026-09-08T19:00:00.000Z"),
};

function createFakeDb(options = {}) {
  const updates = [];
  let booking = options.booking === undefined ? { ...PENDING_UNPAID } : options.booking;

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
    collection(name) {
      if (name === "bookings") {
        return {
          doc() {
            return bookingRef;
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    async runTransaction(fn) {
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

  return { db, updates, getBooking: () => booking };
}

describe("assertCanAcceptBooking", () => {
  it("allows the booking tutor to accept an unpaid pending booking", () => {
    expect(() =>
      assertCanAcceptBooking({
        actorUid: "tutor-1",
        booking: PENDING_UNPAID,
      }),
    ).not.toThrow();
  });

  it("rejects students trying to force acceptance", () => {
    try {
      assertCanAcceptBooking({
        actorUid: "student-1",
        booking: PENDING_UNPAID,
      });
      throw new Error("expected throw");
    } catch (error) {
      expect(error.message).toMatch(/Apenas o professor/);
      expect(error.httpStatus).toBe(ACCEPT_ERROR_STATUS.FORBIDDEN);
    }
  });

  it("rejects duplicate acceptance", () => {
    try {
      assertCanAcceptBooking({
        actorUid: "tutor-1",
        booking: { ...PENDING_UNPAID, paymentStatus: "awaiting_payment" },
      });
      throw new Error("expected throw");
    } catch (error) {
      expect(error.message).toMatch(/já foi aceita/);
      expect(error.httpStatus).toBe(ACCEPT_ERROR_STATUS.ALREADY_ACCEPTED);
    }
  });
});

describe("acceptBookingForTutor", () => {
  it("moves paymentStatus from unpaid to awaiting_payment without confirming the booking", async () => {
    const { db, updates, getBooking } = createFakeDb();

    const result = await acceptBookingForTutor(
      db,
      { actorUid: "tutor-1", bookingId: "booking-1" },
      { timestamp: new Date("2026-09-01T12:00:00.000Z") },
    );

    expect(result).toEqual({
      bookingId: "booking-1",
      paymentStatus: "awaiting_payment",
    });
    expect(updates[0]).toMatchObject({
      paymentStatus: "awaiting_payment",
    });
    expect(getBooking()).toMatchObject({
      status: "pending",
      paymentStatus: "awaiting_payment",
    });
    expect(getBooking()?.meetingUrl).toBeUndefined();
  });
});
