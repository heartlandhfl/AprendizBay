import { describe, expect, it, vi } from "vitest";
import { acceptBookingForTutor } from "@/lib/bookings/accept-booking";
import type { BookingRecord } from "@/lib/bookings/server";
import { generateMeetingUrl } from "@/lib/bookings/meeting";
import {
  buildVerifiedPaymentWebhookEvent,
  createMemoryPaymentWebhookStore,
  processPaymentWebhook,
} from "@/lib/payments/process-payment-webhook";
import { canStartCheckout } from "@/lib/payments/status";

function pendingBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "booking-journey-1",
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    status: "pending",
    price: 80,
    platformFee: 8,
    tutorAmount: 72,
    paymentStatus: "unpaid",
    scheduledAt: new Date("2026-09-08T19:00:00Z"),
    ...overrides,
  };
}

function createFakeAcceptDb(booking: Record<string, unknown>) {
  let current = { ...booking };
  const bookingRef = {
    async get() {
      return { exists: true, data: () => current };
    },
  };

  const db = {
    collection(name: string) {
      if (name !== "bookings") {
        throw new Error(`unexpected collection ${name}`);
      }
      return {
        doc() {
          return bookingRef;
        },
      };
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
          current = { ...current, ...data };
        },
      });
    },
  };

  return {
    db,
    getBooking: () => current,
  };
}

describe("booking payment journey", () => {
  it("moves unpaid → awaiting_payment → paid with a meeting URL and idempotent webhook replay", async () => {
    const { db, getBooking } = createFakeAcceptDb(
      pendingBooking() as unknown as Record<string, unknown>,
    );

    expect(canStartCheckout(getBooking() as unknown as BookingRecord)).toBe(false);

    await acceptBookingForTutor(
      db,
      { actorUid: "tutor-1", bookingId: "booking-journey-1" },
      { timestamp: new Date("2026-09-01T12:00:00.000Z") },
    );

    const awaiting = getBooking();
    expect(awaiting.paymentStatus).toBe("awaiting_payment");
    expect(awaiting.status).toBe("pending");
    expect(canStartCheckout(awaiting as unknown as BookingRecord)).toBe(true);

    const store = createMemoryPaymentWebhookStore(
      new Map([
        [
          "booking-journey-1",
          pendingBooking({
            paymentStatus: "awaiting_payment",
          }),
        ],
      ]),
    );
    const onPaid = vi.fn(async () => undefined);
    const event = buildVerifiedPaymentWebhookEvent({
      provider: "mercadopago",
      paymentId: "mp-12345",
      status: "paid",
      bookingId: "booking-journey-1",
      amount: 80,
    });

    const paid = await processPaymentWebhook(event, { store, onPaid });
    expect(paid.confirmed).toBe(true);
    expect(onPaid).toHaveBeenCalledTimes(1);

    const confirmed = store.bookings.get("booking-journey-1");
    expect(confirmed).toMatchObject({
      status: "confirmed",
      paymentStatus: "paid",
      paymentId: "mp-12345",
    });
    expect(confirmed?.meetingRoomToken).toMatch(/^[a-f0-9]{32}$/);
    expect(confirmed?.meetingUrl).toBe(
      generateMeetingUrl(confirmed?.meetingRoomToken ?? ""),
    );

    const duplicate = await processPaymentWebhook(event, { store, onPaid });
    expect(duplicate.alreadyProcessed).toBe(true);
    expect(onPaid).toHaveBeenCalledTimes(1);
    expect(store.bookings.get("booking-journey-1")?.meetingUrl).toBe(confirmed?.meetingUrl);
  });
});
