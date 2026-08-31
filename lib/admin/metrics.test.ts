import { describe, expect, it } from "vitest";
import {
  countTutorStatuses,
  hasRecordedRefund,
  serializeReview,
  summarizePaidBookings,
  summarizeRefunds,
} from "@/lib/admin/metrics";

describe("countTutorStatuses", () => {
  it("classifies missing verificationStatus from isVerified without inventing extras", () => {
    expect(
      countTutorStatuses([
        { verificationStatus: "pending" },
        { isVerified: true },
        { verificationStatus: "changes_requested" },
        { verificationStatus: "rejected" },
        { verificationStatus: "suspended" },
        { isVerified: false },
      ]),
    ).toEqual({
      pending: 2,
      approved: 1,
      changes_requested: 1,
      rejected: 1,
      suspended: 1,
    });
  });
});

describe("summarizePaidBookings", () => {
  it("sums complete payment splits", () => {
    expect(
      summarizePaidBookings([
        { price: 100, platformFee: 10, tutorAmount: 90 },
        { price: 50, platformFee: 5, tutorAmount: 45 },
      ]),
    ).toEqual({
      gross: { available: true, value: 150 },
      platformFees: { available: true, value: 15 },
      tutorAmount: { available: true, value: 135 },
    });
  });

  it("returns zero when there are no paid bookings", () => {
    expect(summarizePaidBookings([])).toEqual({
      gross: { available: true, value: 0 },
      platformFees: { available: true, value: 0 },
      tutorAmount: { available: true, value: 0 },
    });
  });

  it("marks incomplete fee fields as unavailable instead of inventing a split", () => {
    expect(
      summarizePaidBookings([
        { price: 100, platformFee: 10, tutorAmount: 90 },
        { price: 80 },
      ]),
    ).toEqual({
      gross: { available: true, value: 180 },
      platformFees: { available: false },
      tutorAmount: { available: false },
    });
  });
});

describe("summarizeRefunds", () => {
  it("counts recorded refunds and sums amounts only when every row has a value", () => {
    expect(
      summarizeRefunds([
        { refundId: "ref_1", refundAmount: 70 },
        { refundStatus: "DONE", refundAmount: 30 },
        { status: "cancelled" },
      ]),
    ).toEqual({
      count: { available: true, value: 2 },
      amount: { available: true, value: 100 },
    });
  });

  it("does not invent a refund total when an amount is missing", () => {
    expect(summarizeRefunds([{ refundId: "ref_1" }])).toEqual({
      count: { available: true, value: 1 },
      amount: { available: false },
    });
  });
});

describe("hasRecordedRefund", () => {
  it("ignores in-progress claims", () => {
    expect(hasRecordedRefund({ refundStatus: "REFUND_IN_PROGRESS" })).toBe(false);
    expect(hasRecordedRefund({ refundId: "ref_1" })).toBe(true);
  });
});

describe("serializeReview", () => {
  it("keeps only stored review fields", () => {
    expect(
      serializeReview("booking-1", {
        tutorId: "tutor-1",
        studentId: "student-1",
        bookingId: "booking-1",
        rating: 5,
        comment: "Ótima aula.",
        createdAt: new Date("2026-08-01T12:00:00.000Z"),
      }),
    ).toEqual({
      id: "booking-1",
      tutorId: "tutor-1",
      studentId: "student-1",
      bookingId: "booking-1",
      rating: 5,
      comment: "Ótima aula.",
      createdAt: "2026-08-01T12:00:00.000Z",
    });
  });
});
