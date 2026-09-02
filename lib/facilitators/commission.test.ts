import { describe, expect, it } from "vitest";
import { buildCommissionDocId } from "@/lib/facilitators/schema";
import { resolveBookingFeeSplit } from "@/lib/payments/fees";

describe("facilitator commission helpers", () => {
  it("builds stable commission document ids per booking", () => {
    expect(buildCommissionDocId("booking-123")).toBe("booking_booking-123");
  });

  it("derives commission base from platform fee", () => {
    const split = resolveBookingFeeSplit({ price: 100, platformFee: 10, tutorAmount: 90 });
    const commissionAmount = Math.round(split.platformFee * 0.15 * 100) / 100;
    expect(commissionAmount).toBe(1.5);
  });
});
