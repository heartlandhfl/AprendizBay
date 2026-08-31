"use strict";

const { resolveVerificationStatus } = require("../tutors/verification");

const RECORDED_REFUND_STATUSES = new Set(["REFUNDED", "REFUND_REQUESTED", "DONE"]);
const TUTOR_STATUSES = [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
  "suspended",
];

function availableMetric(value) {
  return { available: true, value };
}

function unavailableMetric() {
  return { available: false };
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function hasRecordedRefund(booking) {
  if (typeof booking?.refundId === "string" && booking.refundId.trim()) {
    return true;
  }

  const status =
    typeof booking?.refundStatus === "string"
      ? booking.refundStatus.trim().toUpperCase()
      : "";
  return Boolean(status && RECORDED_REFUND_STATUSES.has(status));
}

function emptyTutorStatusCounts() {
  return {
    pending: 0,
    approved: 0,
    changes_requested: 0,
    rejected: 0,
    suspended: 0,
  };
}

function countTutorStatuses(tutorDocs) {
  const counts = emptyTutorStatusCounts();

  for (const data of tutorDocs) {
    const status = resolveVerificationStatus(data);
    if (status in counts) {
      counts[status] += 1;
    }
  }

  return counts;
}

function summarizeMoneyField(rows, field) {
  if (rows.length === 0) {
    return availableMetric(0);
  }

  let total = 0;
  for (const row of rows) {
    const value = row[field];
    if (!isFiniteNumber(value)) {
      return unavailableMetric();
    }
    total += value;
  }

  return availableMetric(Math.round(total * 100) / 100);
}

function summarizePaidBookings(paidBookings) {
  return {
    gross: summarizeMoneyField(paidBookings, "price"),
    platformFees: summarizeMoneyField(paidBookings, "platformFee"),
    tutorAmount: summarizeMoneyField(paidBookings, "tutorAmount"),
  };
}

function summarizeRefunds(bookings) {
  const refunded = bookings.filter(hasRecordedRefund);
  return {
    count: availableMetric(refunded.length),
    amount: summarizeMoneyField(refunded, "refundAmount"),
  };
}

function serializeReview(id, data) {
  const createdAt = serializeTimestamp(data?.createdAt);

  return {
    id,
    tutorId: typeof data?.tutorId === "string" ? data.tutorId : "",
    studentId: typeof data?.studentId === "string" ? data.studentId : "",
    bookingId: typeof data?.bookingId === "string" ? data.bookingId : id,
    rating: isFiniteNumber(data?.rating) ? data.rating : 0,
    comment: typeof data?.comment === "string" ? data.comment : "",
    createdAt,
  };
}

function serializeTimestamp(value) {
  if (!value) {
    return null;
  }
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
}

module.exports = {
  RECORDED_REFUND_STATUSES,
  TUTOR_STATUSES,
  availableMetric,
  countTutorStatuses,
  emptyTutorStatusCounts,
  hasRecordedRefund,
  serializeReview,
  serializeTimestamp,
  summarizeMoneyField,
  summarizePaidBookings,
  summarizeRefunds,
  unavailableMetric,
};
