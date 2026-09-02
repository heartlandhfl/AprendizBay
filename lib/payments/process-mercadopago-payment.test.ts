import { describe, expect, it, vi } from "vitest";
import type { BookingRecord } from "@/lib/bookings/server";
import {
  PROCESS_PAYMENT_ERRORS,
  createMemoryProcessPaymentStore,
  processMercadoPagoBookingPayment,
} from "@/lib/payments/process-mercadopago-payment";

function payableBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
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

describe("processMercadoPagoBookingPayment", () => {
  it("creates a payment using the authoritative booking price", async () => {
    const store = createMemoryProcessPaymentStore(
      new Map([["booking-123", payableBooking()]]),
      new Map([["tutor-1", { isVerified: true }]]),
    );
    const createPayment = vi.fn(async () => ({
      id: "12345",
      status: "pending" as const,
      statusDetail: "pending_waiting_payment",
      externalReference: "booking-123",
      transactionAmount: 80,
      currencyId: "BRL",
    }));

    const result = await processMercadoPagoBookingPayment(
      {
        uid: "student-1",
        bookingId: "booking-123",
        token: "card-token",
        paymentMethodId: "visa",
        installments: 1,
        payerEmail: "ana@test.com",
      },
      {
        store,
        createPayment,
        getProfile: async () => ({ email: "ana@test.com", displayName: "Ana" }),
        requireMercadoPagoConfigured: () => undefined,
      },
    );

    expect(result).toMatchObject({
      ok: true,
      paymentId: "12345",
      status: "pending",
    });
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "booking-123",
        transactionAmount: 80,
        token: "card-token",
      }),
    );
    expect(store.bookings.get("booking-123")).toMatchObject({
      paymentStatus: "awaiting_payment",
      paymentId: "12345",
      mercadopagoPaymentStatus: "pending",
    });
  });

  it("rejects payment for another student's booking", async () => {
    const store = createMemoryProcessPaymentStore(
      new Map([["booking-123", payableBooking()]]),
      new Map([["tutor-1", { isVerified: true }]]),
    );

    const result = await processMercadoPagoBookingPayment(
      {
        uid: "other-student",
        bookingId: "booking-123",
        token: "card-token",
        paymentMethodId: "visa",
        installments: 1,
      },
      {
        store,
        createPayment: vi.fn(),
        requireMercadoPagoConfigured: () => undefined,
      },
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: PROCESS_PAYMENT_ERRORS.notOwner,
    });
  });

  it("does not mark the booking as paid after submission", async () => {
    const store = createMemoryProcessPaymentStore(
      new Map([["booking-123", payableBooking()]]),
      new Map([["tutor-1", { isVerified: true }]]),
    );

    await processMercadoPagoBookingPayment(
      {
        uid: "student-1",
        bookingId: "booking-123",
        token: "card-token",
        paymentMethodId: "visa",
        installments: 1,
        payerEmail: "ana@test.com",
      },
      {
        store,
        createPayment: vi.fn(async () => ({
          id: "12345",
          status: "approved" as const,
          externalReference: "booking-123",
        })),
        getProfile: async () => ({ email: "ana@test.com" }),
        requireMercadoPagoConfigured: () => undefined,
      },
    );

    expect(store.bookings.get("booking-123")).toMatchObject({
      paymentStatus: "awaiting_payment",
      status: "pending",
    });
  });
});
