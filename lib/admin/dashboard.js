"use strict";

const {
  availableMetric,
  countTutorStatuses,
  serializeReview,
  summarizePaidBookings,
  summarizeRefunds,
  unavailableMetric,
} = require("./metrics");

const RECENT_REVIEW_LIMIT = 10;

function metricFromCount(countPromise) {
  return countPromise
    .then((value) => availableMetric(value))
    .catch(() => unavailableMetric());
}

async function countWhere(db, collectionName, field, value) {
  const snapshot = await db
    .collection(collectionName)
    .where(field, "==", value)
    .count()
    .get();
  return snapshot.data().count;
}

async function getFilteredDocs(db, collectionName, field, value, selectFields) {
  let query = db.collection(collectionName).where(field, "==", value);
  if (selectFields && selectFields.length > 0 && typeof query.select === "function") {
    query = query.select(...selectFields);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

async function listTutorStatusDocs(db) {
  let query = db.collection("tutors");
  if (typeof query.select === "function") {
    query = query.select("verificationStatus", "isVerified");
  }
  const snapshot = await query.get();
  return snapshot.docs.map((docSnap) => docSnap.data() || {});
}

async function listRecentReviews(db, limit) {
  let query = db.collection("reviews");
  if (typeof query.orderBy === "function") {
    query = query.orderBy("createdAt", "desc");
  }
  if (typeof query.limit === "function") {
    query = query.limit(limit);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((docSnap) => serializeReview(docSnap.id, docSnap.data() || {}));
}

function mergeBookingsById(groups) {
  const byId = new Map();
  for (const group of groups) {
    for (const booking of group) {
      byId.set(booking.id, booking);
    }
  }
  return [...byId.values()];
}

async function buildAdminOperationsDashboard({ db }, options = {}) {
  const reviewLimit =
    Number.isInteger(options.reviewLimit) && options.reviewLimit > 0
      ? options.reviewLimit
      : RECENT_REVIEW_LIMIT;

  const [
    students,
    tutorUsers,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    cancelledBookings,
    awaitingPayment,
    paidPayments,
    tutorDocsResult,
    paidBookingsResult,
    refundedByStatusResult,
    recentReviewsResult,
  ] = await Promise.all([
    metricFromCount(countWhere(db, "users", "role", "student")),
    metricFromCount(countWhere(db, "users", "role", "tutor")),
    metricFromCount(countWhere(db, "bookings", "status", "pending")),
    metricFromCount(countWhere(db, "bookings", "status", "confirmed")),
    metricFromCount(countWhere(db, "bookings", "status", "completed")),
    metricFromCount(countWhere(db, "bookings", "status", "cancelled")),
    metricFromCount(countWhere(db, "bookings", "paymentStatus", "awaiting_payment")),
    metricFromCount(countWhere(db, "bookings", "paymentStatus", "paid")),
    listTutorStatusDocs(db).then((docs) => docs).catch(() => null),
    getFilteredDocs(db, "bookings", "paymentStatus", "paid", [
      "price",
      "platformFee",
      "tutorAmount",
      "refundId",
      "refundStatus",
      "refundAmount",
    ]).catch(() => null),
    Promise.all([
      getFilteredDocs(db, "bookings", "refundStatus", "REFUNDED", [
        "refundId",
        "refundStatus",
        "refundAmount",
      ]),
      getFilteredDocs(db, "bookings", "refundStatus", "REFUND_REQUESTED", [
        "refundId",
        "refundStatus",
        "refundAmount",
      ]),
      getFilteredDocs(db, "bookings", "refundStatus", "DONE", [
        "refundId",
        "refundStatus",
        "refundAmount",
      ]),
    ]).catch(() => null),
    listRecentReviews(db, reviewLimit).catch(() => null),
  ]);

  const tutorCounts = tutorDocsResult ? countTutorStatuses(tutorDocsResult) : null;
  const tutorMetric = (status) =>
    tutorCounts ? availableMetric(tutorCounts[status]) : unavailableMetric();

  const paidBookings = paidBookingsResult ?? [];
  const paymentTotals =
    paidBookingsResult === null
      ? {
          gross: unavailableMetric(),
          platformFees: unavailableMetric(),
          tutorAmount: unavailableMetric(),
        }
      : summarizePaidBookings(paidBookings);

  const refundCandidates =
    refundedByStatusResult === null && paidBookingsResult === null
      ? null
      : mergeBookingsById([
          paidBookingsResult ?? [],
          ...(refundedByStatusResult ?? []),
        ]);
  const refunds = refundCandidates
    ? summarizeRefunds(refundCandidates)
    : { count: unavailableMetric(), amount: unavailableMetric() };

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      students,
      tutors: tutorUsers,
      pendingTutors: tutorMetric("pending"),
      pendingBookings,
      confirmedBookings,
      completedBookings,
      awaitingPayments: awaitingPayment,
      completedPayments: paidPayments,
      cancellations: cancelledBookings,
      refunds: refunds.count,
    },
    tutors: {
      pending: tutorMetric("pending"),
      approved: tutorMetric("approved"),
      changesRequested: tutorMetric("changes_requested"),
      rejected: tutorMetric("rejected"),
      suspended: tutorMetric("suspended"),
    },
    bookings: {
      pending: pendingBookings,
      awaitingPayment,
      confirmed: confirmedBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
    },
    payments: {
      gross: paymentTotals.gross,
      platformFees: paymentTotals.platformFees,
      tutorAmount: paymentTotals.tutorAmount,
      refunds: refunds.amount,
    },
    reviews: {
      recent: recentReviewsResult ?? [],
      recentAvailable: recentReviewsResult !== null,
      reported: unavailableMetric(),
    },
    users: {
      students,
      tutors: tutorUsers,
      suspendedAccounts: tutorMetric("suspended"),
    },
  };
}

module.exports = {
  RECENT_REVIEW_LIMIT,
  buildAdminOperationsDashboard,
  countWhere,
};
