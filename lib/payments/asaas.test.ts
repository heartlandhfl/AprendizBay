import { describe, expect, it } from "vitest";
import {
  isAsaasAlreadyRefundedError,
  parseAsaasRefund,
  parseAsaasWebhook,
  resolveAsaasWebhookOutcome,
} from "@/lib/payments/asaas";

describe("Asaas webhook outcomes", () => {
  it("maps confirmed and received events to a successful payment", () => {
    expect(resolveAsaasWebhookOutcome({ event: "PAYMENT_CONFIRMED" })).toBe("successful");
    expect(resolveAsaasWebhookOutcome({ event: "CHECKOUT_PAID", checkoutStatus: "PAID" })).toBe(
      "successful",
    );
    expect(
      parseAsaasWebhook({
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay_1", status: "RECEIVED", externalReference: "booking-1" },
      }).isSuccessfulPayment,
    ).toBe(true);
  });

  it("maps card capture refusal to a failed payment", () => {
    const event = parseAsaasWebhook({
      event: "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
      payment: {
        id: "pay_refused",
        externalReference: "booking-123",
        checkoutSession: "checkout-abc",
      },
    });

    expect(event.outcome).toBe("failed");
    expect(event.isSuccessfulPayment).toBe(false);
    expect(event.bookingId).toBe("booking-123");
  });

  it("maps expired and abandoned checkouts to expired", () => {
    expect(
      parseAsaasWebhook({
        event: "CHECKOUT_EXPIRED",
        checkout: { id: "checkout-abc", status: "EXPIRED", externalReference: "booking-123" },
      }).outcome,
    ).toBe("expired");
    expect(
      parseAsaasWebhook({
        event: "CHECKOUT_CANCELED",
        checkout: { id: "checkout-abc", externalReference: "booking-123" },
      }).outcome,
    ).toBe("expired");
  });

  it("does not treat checkout created or payment created as paid", () => {
    expect(parseAsaasWebhook({ event: "PAYMENT_CREATED" }).outcome).toBe("ignored");
    expect(parseAsaasWebhook({ event: "CHECKOUT_CREATED" }).outcome).toBe("ignored");
  });
});

describe("Asaas refund responses", () => {
  it("accepts a confirmed Asaas refund status and amount", () => {
    expect(
      parseAsaasRefund({
        id: "pay_080225913252",
        status: "REFUNDED",
        value: 80,
        refunds: [{ status: "DONE", value: 80, endToEndIdentifier: "E123" }],
      }),
    ).toMatchObject({
      paymentId: "pay_080225913252",
      status: "REFUNDED",
      refundId: "E123",
      refundAmount: 80,
    });
  });

  it("does not treat a mere payment id as a successful refund", () => {
    expect(() =>
      parseAsaasRefund({
        id: "pay_080225913252",
        status: "CONFIRMED",
        value: 80,
      }),
    ).toThrow(/não confirmou o estorno/i);
  });

  it("detects an already-refunded Asaas error for idempotent retries", () => {
    expect(
      isAsaasAlreadyRefundedError({
        errors: [{ description: "Payment already refunded." }],
      }),
    ).toBe(true);
  });
});
