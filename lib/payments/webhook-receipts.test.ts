import { describe, expect, it } from "vitest";
import {
  asaasWebhookReceiptDocId,
  buildAsaasWebhookReceiptIds,
} from "@/lib/payments/webhook-receipts";

describe("asaas webhook receipt keys", () => {
  it("keys a payment, checkout and booking so replays of the same charge collide", () => {
    expect(
      buildAsaasWebhookReceiptIds({
        paymentId: "pay_080225913252",
        asaasCheckoutId: "checkout-abc",
        bookingId: "booking-123",
      }),
    ).toEqual([
      "payment_pay_080225913252",
      "checkout_checkout-abc",
      "booking-paid_booking-123",
    ]);
  });

  it("sanitizes characters that are illegal in Firestore document ids", () => {
    expect(asaasWebhookReceiptDocId("payment", "pay/abc.def")).toBe("payment_pay_abc_def");
  });
});
