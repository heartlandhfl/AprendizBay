import { describe, expect, it } from "vitest";
import {
  formatEarningsAmount,
  getTutorEarningsSummary,
  summarizeTutorPayouts,
} from "@/lib/tutors/earnings";

describe("summarizeTutorPayouts", () => {
  it("sums only authoritative payout statuses and ignores failed rows", () => {
    const summary = summarizeTutorPayouts([
      { amount: 80, status: "paid", tutorId: "tutor-1" },
      { amount: 45.5, status: "pending", tutorId: "tutor-1" },
      { amount: 20, status: "processing", tutorId: "tutor-1" },
      { amount: 99, status: "failed", tutorId: "tutor-1" },
      { amount: 10, status: "cancelled", tutorId: "tutor-1" },
      { amount: "nope", status: "paid", tutorId: "tutor-1" },
    ]);

    expect(summary).toEqual({
      paidTotal: 80,
      pendingTotal: 45.5,
      processingTotal: 20,
      paidCount: 1,
      pendingCount: 1,
      processingCount: 1,
    });
  });

  it("returns zeros when there are no payouts", () => {
    expect(summarizeTutorPayouts([])).toEqual({
      paidTotal: 0,
      pendingTotal: 0,
      processingTotal: 0,
      paidCount: 0,
      pendingCount: 0,
      processingCount: 0,
    });
  });
});

describe("getTutorEarningsSummary", () => {
  it("reads only payouts owned by the authenticated tutor id", async () => {
    const docs = [
      { tutorId: "tutor-1", amount: 30, status: "paid" },
      { tutorId: "other", amount: 999, status: "paid" },
    ];

    const db = {
      collection(name: string) {
        expect(name).toBe("tutorPayouts");
        return {
          where(field: string, op: string, value: string) {
            expect(field).toBe("tutorId");
            expect(op).toBe("==");
            expect(value).toBe("tutor-1");
            return {
              async get() {
                return {
                  docs: docs
                    .filter((doc) => doc.tutorId === value)
                    .map((doc) => ({ data: () => doc })),
                };
              },
            };
          },
        };
      },
    };

    const summary = await getTutorEarningsSummary(db as never, "tutor-1");
    expect(summary.paidTotal).toBe(30);
    expect(summary.paidCount).toBe(1);
  });
});

describe("formatEarningsAmount", () => {
  it("formats BRL for the dashboard", () => {
    expect(formatEarningsAmount(80)).toMatch(/R\$\s*80/);
  });
});
