import { afterEach, describe, expect, it, vi } from "vitest";
import type { BookingRecord } from "@/lib/bookings/server";
import { generateMeetingUrl } from "@/lib/bookings/meeting-server";
import {
  buildVerifiedPaymentWebhookEvent,
  createMemoryPaymentWebhookStore,
  processPaymentWebhook,
} from "@/lib/payments/process-payment-webhook";
import {
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_CONFIRMED_MESSAGE,
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

describe("processPaymentWebhook", () => {
  it("confirms the booking on a paid webhook", async () => {
    const store = createMemoryPaymentWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onPaid = vi.fn(async () => undefined);

    const result = await processPaymentWebhook(
      buildVerifiedPaymentWebhookEvent({
        provider: "mercadopago",
        paymentId: "12345",
        status: "paid",
        bookingId: "booking-123",
        amount: 80,
      }),
      { store, onPaid },
    );

    expect(result.message).toBe(WEBHOOK_CONFIRMED_MESSAGE);
    expect(result.confirmed).toBe(true);
    expect(onPaid).toHaveBeenCalledTimes(1);
    expect(store.bookings.get("booking-123")).toMatchObject({
      status: "confirmed",
      paymentStatus: "paid",
      meetingUrl: generateMeetingUrl("booking-123"),
    });
    expect(store.payments.get("mercadopago_12345")).toMatchObject({
      status: "paid",
      bookingId: "booking-123",
    });
  });

  it("marks the booking as failed and invokes onFailed", async () => {
    const store = createMemoryPaymentWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onFailed = vi.fn(async () => undefined);

    const result = await processPaymentWebhook(
      buildVerifiedPaymentWebhookEvent({
        provider: "mercadopago",
        paymentId: "99999",
        status: "failed",
        bookingId: "booking-123",
      }),
      { store, onFailed },
    );

    expect(result.kind).toBe("failed");
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(store.bookings.get("booking-123")?.paymentStatus).toBe("failed");
  });

  it("is idempotent using paymentWebhookReceipts", async () => {
    const store = createMemoryPaymentWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onPaid = vi.fn(async () => undefined);
    const event = buildVerifiedPaymentWebhookEvent({
      provider: "mercadopago",
      paymentId: "12345",
      status: "paid",
      bookingId: "booking-123",
      amount: 80,
    });

    await processPaymentWebhook(event, { store, onPaid });
    const duplicate = await processPaymentWebhook(event, { store, onPaid });

    expect(duplicate.message).toBe(WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    expect(onPaid).toHaveBeenCalledTimes(1);
    expect(store.receipts.get("mercadopago_12345")).toBeDefined();
  });
});

describe("processPaymentWebhook with JITSI_ROOM_SECRET", () => {
  afterEach(() => {
    delete process.env.JITSI_ROOM_SECRET;
  });

  it("persists a suffixed meeting URL on first successful payment", async () => {
    process.env.JITSI_ROOM_SECRET = "test-room-secret";
    const store = createMemoryPaymentWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onPaid = vi.fn(async () => undefined);

    await processPaymentWebhook(
      buildVerifiedPaymentWebhookEvent({
        provider: "mercadopago",
        paymentId: "12345",
        status: "paid",
        bookingId: "booking-123",
        amount: 80,
      }),
      { store, onPaid },
    );

    const meetingUrl = store.bookings.get("booking-123")?.meetingUrl;
    expect(meetingUrl).toBe(generateMeetingUrl("booking-123"));
    expect(meetingUrl).toMatch(
      /^https:\/\/meet\.jit\.si\/aprendizbay-booking-123-[a-f0-9]{16}$/,
    );
  });

  it("preserves the first stored meeting URL on duplicate webhook delivery", async () => {
    process.env.JITSI_ROOM_SECRET = "test-room-secret";
    const store = createMemoryPaymentWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onPaid = vi.fn(async () => undefined);
    const event = buildVerifiedPaymentWebhookEvent({
      provider: "mercadopago",
      paymentId: "12345",
      status: "paid",
      bookingId: "booking-123",
      amount: 80,
    });

    await processPaymentWebhook(event, { store, onPaid });
    const firstUrl = store.bookings.get("booking-123")?.meetingUrl;

    process.env.JITSI_ROOM_SECRET = "rotated-secret";
    const duplicate = await processPaymentWebhook(event, { store, onPaid });

    expect(duplicate.alreadyProcessed).toBe(true);
    expect(store.bookings.get("booking-123")?.meetingUrl).toBe(firstUrl);
  });
});
