import { describe, expect, it } from "vitest";
import {
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
