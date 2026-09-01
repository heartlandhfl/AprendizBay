import { describe, expect, it } from "vitest";
import {
  authoritativeLessonPrice,
  brlToCents,
  centsToBrl,
  comparePaidAmountToExpected,
  parseMoneyToCents,
  splitBookingPriceFromCents,
} from "@/lib/payments/money";

describe("integer-cent money helpers", () => {
  it("converts BRL to cents without floating-point drift", () => {
    expect(brlToCents(70)).toBe(7000);
    expect(brlToCents(69.99)).toBe(6999);
    expect(brlToCents(70.01)).toBe(7001);
    expect(brlToCents("70,00")).toBe(7000);
    expect(centsToBrl(7000)).toBe(70);
    expect(centsToBrl(6999)).toBe(69.99);
  });

  it("treats missing and malformed amounts as parse failures", () => {
    expect(parseMoneyToCents(undefined)).toEqual({ status: "missing" });
    expect(parseMoneyToCents("")).toEqual({ status: "missing" });
    expect(parseMoneyToCents("abc")).toEqual({ status: "malformed" });
    expect(parseMoneyToCents({ value: 70 })).toEqual({ status: "malformed" });
    expect(parseMoneyToCents(Number.NaN)).toEqual({ status: "malformed" });
  });

  it("requires an exact cent match for a successful payment", () => {
    expect(comparePaidAmountToExpected(70, 70)).toMatchObject({
      ok: true,
      reason: "match",
      expectedCents: 7000,
      paidCents: 7000,
    });
    expect(comparePaidAmountToExpected(1, 70).reason).toBe("too_low");
    expect(comparePaidAmountToExpected(69.99, 70).reason).toBe("too_low");
    expect(comparePaidAmountToExpected(70.01, 70).reason).toBe("too_high");
    expect(comparePaidAmountToExpected(undefined, 70).reason).toBe("missing");
    expect(comparePaidAmountToExpected("x", 70).reason).toBe("malformed");
  });

  it("splits platform fee from trusted cents", () => {
    expect(splitBookingPriceFromCents(7000, 10)).toMatchObject({
      platformFee: 7,
      tutorAmount: 63,
      platformFeeCents: 700,
      tutorAmountCents: 6300,
    });
    expect(authoritativeLessonPrice(1)).toEqual({ price: 1, priceCents: 100 });
    expect(authoritativeLessonPrice(0)).toBeNull();
  });
});
