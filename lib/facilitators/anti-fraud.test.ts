import { describe, expect, it } from "vitest";
import { evaluateReferralFraud } from "@/lib/facilitators/anti-fraud";
import type { FacilitatorRecord } from "@/lib/facilitators/schema";

function facilitator(overrides: Partial<FacilitatorRecord> = {}): FacilitatorRecord {
  return {
    facilitatorId: "fac-1",
    userId: "fac-1",
    referralCode: "ana2026",
    displayName: "Ana Facilitadora",
    email: "ana@example.com",
    phone: "11999999999",
    cpf: "39053344705",
    commissionRatePercent: 15,
    status: "active",
    stats: { clicks: 0, signups: 0, activeUsers: 0, paidBookings: 0 },
    ...overrides,
  };
}

describe("evaluateReferralFraud", () => {
  it("rejects when the signup email matches the facilitator email", () => {
    const result = evaluateReferralFraud({
      facilitator: facilitator(),
      userEmail: "ana@example.com",
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("self_referral");
  });

  it("rejects when phone or cpf matches the facilitator", () => {
    const phoneResult = evaluateReferralFraud({
      facilitator: facilitator(),
      userEmail: "student@example.com",
      userPhone: "(11) 99999-9999",
    });
    const cpfResult = evaluateReferralFraud({
      facilitator: facilitator(),
      userEmail: "student@example.com",
      userCpf: "390.533.447-05",
    });

    expect(phoneResult.allowed).toBe(false);
    expect(cpfResult.allowed).toBe(false);
  });

  it("allows a distinct referred user", () => {
    const result = evaluateReferralFraud({
      facilitator: facilitator(),
      userEmail: "student@example.com",
      userPhone: "21988887777",
      userCpf: "24971563792",
    });

    expect(result.allowed).toBe(true);
    expect(result.identityKeys.length).toBeGreaterThan(0);
  });
});
