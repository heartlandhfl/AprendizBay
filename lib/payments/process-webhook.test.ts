import { describe, expect, it, vi } from "vitest";
import type { BookingRecord } from "@/lib/bookings/server";
import { generateMeetingUrl } from "@/lib/bookings/meeting";
import type { AsaasWebhookMatch } from "@/lib/payments/asaas";
import {
  createMemoryWebhookStore,
  processAsaasPaymentWebhook,
} from "@/lib/payments/process-webhook";
import {
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_BOOKING_NOT_FOUND_MESSAGE,
  WEBHOOK_CANCELLED_MESSAGE,
  WEBHOOK_CONFIRMED_MESSAGE,
  buildAsaasWebhookReceiptIds,
} from "@/lib/payments/webhook-receipts";

function pendingBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "booking-123",
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    status: "pending",
    price: 80,
    paymentStatus: "awaiting_payment",
    scheduledAt: new Date("2026-09-08T19:00:00Z"),
    ...overrides,
  };
}

function successfulEvent(overrides: Partial<AsaasWebhookMatch> = {}): AsaasWebhookMatch {
  return {
    event: "PAYMENT_CONFIRMED",
    isSuccessfulPayment: true,
    bookingId: "booking-123",
    paymentId: "pay_080225913252",
    asaasCheckoutId: "checkout-abc",
    ...overrides,
  };
}

describe("processAsaasPaymentWebhook", () => {
  it("confirms the booking once on the first successful webhook", async () => {
    const store = createMemoryWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onConfirmed = vi.fn(async () => undefined);

    const result = await processAsaasPaymentWebhook(successfulEvent(), {
      store,
      onConfirmed,
    });

    expect(result).toMatchObject({
      kind: "confirmed",
      httpStatus: 200,
      message: WEBHOOK_CONFIRMED_MESSAGE,
      confirmed: true,
    });
    expect(onConfirmed).toHaveBeenCalledTimes(1);

    const booking = store.bookings.get("booking-123")!;
    expect(booking.status).toBe("confirmed");
    expect(booking.paymentStatus).toBe("paid");
    expect(booking.meetingUrl).toBe(generateMeetingUrl("booking-123"));
    expect(booking.paymentId).toBe("pay_080225913252");
    expect(Object.keys(booking)).not.toContain("tutorBalance");

    const receiptIds = buildAsaasWebhookReceiptIds(successfulEvent());
    expect(receiptIds.length).toBeGreaterThan(1);
    for (const id of receiptIds) {
      expect(store.receipts.get(id)?.outcome).toBe("confirmed");
    }
  });

  it("returns already processed for an identical second delivery", async () => {
    const store = createMemoryWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onConfirmed = vi.fn(async () => undefined);
    const event = successfulEvent();

    await processAsaasPaymentWebhook(event, { store, onConfirmed });
    const duplicate = await processAsaasPaymentWebhook(event, { store, onConfirmed });

    expect(duplicate.message).toBe(WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    expect(duplicate.alreadyProcessed).toBe(true);
    expect(duplicate.httpStatus).toBe(200);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(store.bookings.get("booking-123")?.meetingUrl).toBe(
      generateMeetingUrl("booking-123"),
    );
  });

  it("treats a later replay of the same payment as already processed", async () => {
    const store = createMemoryWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onConfirmed = vi.fn(async () => undefined);

    await processAsaasPaymentWebhook(successfulEvent(), { store, onConfirmed });

    const replay = await processAsaasPaymentWebhook(
      successfulEvent({ event: "PAYMENT_RECEIVED" }),
      { store, onConfirmed },
    );

    expect(replay.message).toBe(WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(store.bookings.get("booking-123")?.status).toBe("confirmed");
  });

  it("does not confirm a booking that does not exist", async () => {
    const store = createMemoryWebhookStore();
    const onConfirmed = vi.fn(async () => undefined);

    const result = await processAsaasPaymentWebhook(successfulEvent(), {
      store,
      onConfirmed,
    });

    expect(result).toMatchObject({
      kind: "booking_not_found",
      ignored: "booking_not_found",
      message: WEBHOOK_BOOKING_NOT_FOUND_MESSAGE,
      httpStatus: 200,
    });
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(store.receipts.size).toBe(0);
  });

  it("records a cancelled booking without reopening it or sending side effects", async () => {
    const store = createMemoryWebhookStore(
      new Map([
        [
          "booking-123",
          pendingBooking({ status: "cancelled", paymentStatus: "unpaid" }),
        ],
      ]),
    );
    const onConfirmed = vi.fn(async () => undefined);

    const first = await processAsaasPaymentWebhook(successfulEvent(), {
      store,
      onConfirmed,
    });
    const replay = await processAsaasPaymentWebhook(successfulEvent(), {
      store,
      onConfirmed,
    });

    expect(first.message).toBe(WEBHOOK_CANCELLED_MESSAGE);
    expect(first.ignored).toBe("cancelled");
    expect(replay.message).toBe(WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(store.bookings.get("booking-123")?.status).toBe("cancelled");
    expect(store.bookings.get("booking-123")?.meetingUrl).toBeUndefined();
  });

  it("does not revert an already confirmed booking or repeat side effects", async () => {
    const existingUrl = generateMeetingUrl("booking-123");
    const store = createMemoryWebhookStore(
      new Map([
        [
          "booking-123",
          pendingBooking({
            status: "confirmed",
            paymentStatus: "paid",
            meetingUrl: existingUrl,
            paymentId: "pay_old",
          }),
        ],
      ]),
    );
    const onConfirmed = vi.fn(async () => undefined);

    const result = await processAsaasPaymentWebhook(successfulEvent(), {
      store,
      onConfirmed,
    });

    expect(result.message).toBe(WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(store.bookings.get("booking-123")?.meetingUrl).toBe(existingUrl);
    expect(store.bookings.get("booking-123")?.status).toBe("confirmed");
  });

  it("does not reopen a completed lesson when the webhook is replayed", async () => {
    const store = createMemoryWebhookStore(
      new Map([
        [
          "booking-123",
          pendingBooking({
            status: "completed",
            paymentStatus: "paid",
            meetingUrl: generateMeetingUrl("booking-123"),
          }),
        ],
      ]),
    );
    const onConfirmed = vi.fn(async () => undefined);

    const result = await processAsaasPaymentWebhook(successfulEvent(), {
      store,
      onConfirmed,
    });

    expect(result.message).toBe(WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    expect(store.bookings.get("booking-123")?.status).toBe("completed");
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it("lets only one concurrent webhook for the same payment run side effects", async () => {
    const store = createMemoryWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onConfirmed = vi.fn(async () => undefined);
    const event = successfulEvent();

    const [first, second] = await Promise.all([
      processAsaasPaymentWebhook(event, { store, onConfirmed }),
      processAsaasPaymentWebhook(event, { store, onConfirmed }),
    ]);

    const kinds = [first.kind, second.kind].sort();
    expect(kinds).toEqual(["already_processed", "confirmed"]);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(store.bookings.get("booking-123")?.status).toBe("confirmed");
  });
});
