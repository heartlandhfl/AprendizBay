import { describe, expect, it } from "vitest";
import {
  buildPaymentLedgerDocId,
  derivePaymentLedgerAmounts,
} from "@/lib/payments/ledger/schema";

describe("buildPaymentLedgerDocId", () => {
  it("prefixes the provider and sanitizes the provider payment id", () => {
    expect(buildPaymentLedgerDocId("mercadopago", "12345")).toBe("mercadopago_12345");
    expect(buildPaymentLedgerDocId("mercadopago", "pay/123")).toBe("mercadopago_pay_123");
  });
});

describe("derivePaymentLedgerAmounts", () => {
  it("allocates processor fees to platform revenue first", () => {
    expect(
      derivePaymentLedgerAmounts({
        grossAmount: 100,
        platformFee: 10,
        paymentProcessingFee: 4,
      }),
    ).toEqual({
      grossAmount: 100,
      platformFee: 10,
      paymentProcessingFee: 4,
      netPlatformRevenue: 6,
      tutorGrossAmount: 90,
      tutorPayoutAmount: 90,
    });
  });

  it("reduces tutor payout when processor fees exceed platform fee", () => {
    expect(
      derivePaymentLedgerAmounts({
        grossAmount: 80,
        platformFee: 8,
        paymentProcessingFee: 12,
      }),
    ).toEqual({
      grossAmount: 80,
      platformFee: 8,
      paymentProcessingFee: 12,
      netPlatformRevenue: 0,
      tutorGrossAmount: 72,
      tutorPayoutAmount: 68,
    });
  });
});
