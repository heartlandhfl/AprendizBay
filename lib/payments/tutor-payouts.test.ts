import { describe, expect, it } from "vitest";
import type { BookingRecord } from "@/lib/bookings/server";
import { buildTutorPayoutDocId } from "@/lib/payments/ledger/schema";
import { resolveTutorPayoutAmount } from "@/lib/payments/tutor-payouts";

function paidBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "booking-123",
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    status: "completed",
    price: 100,
    platformFee: 10,
    tutorAmount: 90,
    paymentStatus: "paid",
    paymentId: "12345",
    scheduledAt: new Date("2026-09-08T19:00:00Z"),
    ...overrides,
  };
}

describe("resolveTutorPayoutAmount", () => {
  it("prefers tutorPayoutAmount from the payment ledger", () => {
    expect(
      resolveTutorPayoutAmount(paidBooking(), {
        tutorPayoutAmount: 72.5,
      }),
    ).toBe(72.5);
  });

  it("falls back to booking tutorAmount when the ledger is slim", () => {
    expect(resolveTutorPayoutAmount(paidBooking(), { amount: 100 })).toBe(90);
  });

  it("derives the tutor share from the booking price when needed", () => {
    expect(
      resolveTutorPayoutAmount(
        paidBooking({ tutorAmount: undefined, platformFee: undefined, price: 80 }),
        {},
      ),
    ).toBe(72);
  });
});

describe("buildTutorPayoutDocId", () => {
  it("creates a stable payout id per booking", () => {
    expect(buildTutorPayoutDocId("booking-123")).toBe("booking_booking-123");
  });
});
