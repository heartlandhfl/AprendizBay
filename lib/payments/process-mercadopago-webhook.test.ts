import { describe, expect, it, vi } from "vitest";
import type { BookingRecord } from "@/lib/bookings/server";
import { generateMeetingUrl } from "@/lib/bookings/meeting";
import {
  createMemoryMercadoPagoWebhookStore,
  processMercadoPagoPaymentWebhook,
} from "@/lib/payments/process-mercadopago-webhook";
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
    paymentId: "12345",
    scheduledAt: new Date("2026-09-08T19:00:00Z"),
    ...overrides,
  };
}

describe("processMercadoPagoPaymentWebhook", () => {
  it("confirms the booking on an approved payment webhook", async () => {
    const store = createMemoryMercadoPagoWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onApproved = vi.fn(async () => undefined);

    const result = await processMercadoPagoPaymentWebhook(
      {
        paymentId: "12345",
        notificationId: "notif-1",
        requestId: "req-1",
        payment: {
          id: "12345",
          status: "approved",
          externalReference: "booking-123",
          transactionAmount: 80,
          currencyId: "BRL",
        },
      },
      { store, onApproved },
    );

    expect(result.message).toBe(WEBHOOK_CONFIRMED_MESSAGE);
    expect(result.confirmed).toBe(true);
    expect(onApproved).toHaveBeenCalledTimes(1);
    expect(store.bookings.get("booking-123")).toMatchObject({
      status: "confirmed",
      paymentStatus: "paid",
      meetingUrl: generateMeetingUrl("booking-123"),
      mercadopagoPaymentStatus: "approved",
    });
  });

  it("is idempotent for duplicate webhook deliveries", async () => {
    const store = createMemoryMercadoPagoWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );
    const onApproved = vi.fn(async () => undefined);
    const event = {
      paymentId: "12345",
      notificationId: "notif-1",
      payment: {
        id: "12345",
        status: "approved" as const,
        externalReference: "booking-123",
        transactionAmount: 80,
        currencyId: "BRL",
      },
    };

    await processMercadoPagoPaymentWebhook(event, { store, onApproved });
    const duplicate = await processMercadoPagoPaymentWebhook(event, { store, onApproved });

    expect(duplicate.message).toBe(WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    expect(onApproved).toHaveBeenCalledTimes(1);
  });

  it("rejects mismatched payment amounts", async () => {
    const store = createMemoryMercadoPagoWebhookStore(
      new Map([["booking-123", pendingBooking()]]),
    );

    const result = await processMercadoPagoPaymentWebhook(
      {
        paymentId: "12345",
        payment: {
          id: "12345",
          status: "approved",
          externalReference: "booking-123",
          transactionAmount: 10,
          currencyId: "BRL",
        },
      },
      { store },
    );

    expect(result.amountMismatch).toBe(true);
    expect(store.bookings.get("booking-123")?.paymentStatus).toBe("awaiting_payment");
  });
});
