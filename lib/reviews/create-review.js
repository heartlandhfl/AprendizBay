"use strict";

const MAX_REVIEW_ID_LENGTH = 128;
const MAX_COMMENT_LENGTH = 2000;
const VALID_RATINGS = [1, 2, 3, 4, 5];

const REVIEW_ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  INVALID_BOOKING: 400,
  INVALID_TUTOR: 400,
  INVALID_RATING: 400,
  INVALID_COMMENT: 400,
  BOOKING_NOT_FOUND: 404,
  FORBIDDEN_STUDENT: 403,
  BOOKING_NOT_COMPLETED: 409,
  DUPLICATE_REVIEW: 409,
};

function createCodedError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.httpStatus = REVIEW_ERROR_STATUS[code] ?? 400;
  return error;
}

const REVIEW_ACTION_LABELS = {
  eligible: "Avaliar aula",
  submitted: "Avaliação enviada",
};

function studentReviewAction(status, alreadyReviewed) {
  if (status !== "completed") {
    return null;
  }

  if (alreadyReviewed) {
    return { kind: "status", label: REVIEW_ACTION_LABELS.submitted };
  }

  return { kind: "button", label: REVIEW_ACTION_LABELS.eligible };
}

function reviewDocumentId(bookingId) {
  if (typeof bookingId !== "string") {
    return "";
  }

  const id = bookingId.trim();
  if (
    !id ||
    id.length > MAX_REVIEW_ID_LENGTH ||
    id.includes("/") ||
    id.includes("..")
  ) {
    return "";
  }

  return id;
}

function isValidRating(value) {
  return VALID_RATINGS.includes(value);
}

function normalizeComment(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function validateReviewFields(input) {
  const actorUid = typeof input?.actorUid === "string" ? input.actorUid.trim() : "";
  if (!actorUid) {
    throw createCodedError("Faça login para enviar a avaliação.", "UNAUTHENTICATED");
  }

  const bookingId = reviewDocumentId(input?.bookingId);
  if (!bookingId) {
    throw createCodedError("Informe o identificador da reserva.", "INVALID_BOOKING");
  }

  const tutorId = typeof input?.tutorId === "string" ? input.tutorId.trim() : "";
  if (!tutorId || tutorId.includes("/") || tutorId.includes("..")) {
    throw createCodedError("Informe o identificador do professor.", "INVALID_TUTOR");
  }

  if (!isValidRating(input?.rating)) {
    throw createCodedError("Informe uma nota de 1 a 5.", "INVALID_RATING");
  }

  const comment = normalizeComment(input?.comment);
  if (!comment) {
    throw createCodedError("Escreva um comentário sobre a aula.", "INVALID_COMMENT");
  }
  if (comment.length > MAX_COMMENT_LENGTH) {
    throw createCodedError("O comentário deve ter no máximo 2000 caracteres.", "INVALID_COMMENT");
  }

  return { actorUid, bookingId, tutorId, rating: input.rating, comment };
}

function assertCanCreateReview({ actorUid, booking, existingReview, tutorId }) {
  if (!booking) {
    throw createCodedError("Reserva não encontrada.", "BOOKING_NOT_FOUND");
  }

  if (booking.studentId !== actorUid) {
    throw createCodedError(
      "Você só pode avaliar as suas próprias aulas.",
      "FORBIDDEN_STUDENT",
    );
  }

  if (booking.status !== "completed") {
    throw createCodedError(
      "Só é possível avaliar uma aula concluída.",
      "BOOKING_NOT_COMPLETED",
    );
  }

  if (booking.tutorId !== tutorId) {
    throw createCodedError(
      "A avaliação deve ser do professor desta aula.",
      "INVALID_TUTOR",
    );
  }

  if (existingReview) {
    throw createCodedError("Esta aula já foi avaliada.", "DUPLICATE_REVIEW");
  }
}

function reviewCreatedAtMs(value) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "object") {
    if (typeof value.toMillis === "function") {
      return value.toMillis();
    }
    if (typeof value.toDate === "function") {
      return value.toDate().getTime();
    }
    if (typeof value._seconds === "number") {
      return value._seconds * 1000;
    }
    if (typeof value.seconds === "number") {
      return value.seconds * 1000;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).getTime();
  }
  return Number.POSITIVE_INFINITY;
}

function ratingsFromReviewDocs(docs) {
  const byBooking = new Map();

  for (const docSnap of docs) {
    const data = typeof docSnap.data === "function" ? docSnap.data() : docSnap;
    if (!data || typeof data.rating !== "number" || !Number.isFinite(data.rating)) {
      continue;
    }

    const bookingId =
      typeof data.bookingId === "string" && data.bookingId.trim()
        ? data.bookingId.trim()
        : docSnap.id;
    const existing = byBooking.get(bookingId);
    if (!existing || docSnap.id === bookingId) {
      byBooking.set(bookingId, data.rating);
    }
  }

  return Array.from(byBooking.values());
}

function computeTutorRatingFromRatings(ratings) {
  const numeric = ratings.filter(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const reviewCount = numeric.length;
  const rating =
    reviewCount > 0
      ? Math.round(
          (numeric.reduce((sum, value) => sum + value, 0) / reviewCount) * 10,
        ) / 10
      : 0;
  return { rating, reviewCount };
}

function statusFromCreateReviewError(error) {
  if (error && typeof error === "object" && typeof error.httpStatus === "number") {
    return error.httpStatus;
  }

  const code = error && typeof error === "object" ? error.code : undefined;
  if (code && REVIEW_ERROR_STATUS[code]) {
    return REVIEW_ERROR_STATUS[code];
  }

  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("Token") ||
    message.includes("autenticação") ||
    message.includes("login") ||
    message.includes("id-token") ||
    message.includes("Decoding Firebase ID token")
  ) {
    return 401;
  }
  if (message.includes("Firebase Admin")) {
    return 503;
  }
  return 500;
}

function snapshotData(snapshot) {
  if (!snapshot || !snapshot.exists) {
    return null;
  }
  return snapshot.data() ?? null;
}

async function findExistingReviewForBooking(db, bookingId) {
  const canonical = await db.collection("reviews").doc(bookingId).get();
  if (canonical.exists) {
    return { id: canonical.id, data: snapshotData(canonical) };
  }

  const leftover = await db
    .collection("reviews")
    .where("bookingId", "==", bookingId)
    .limit(1)
    .get();

  if (leftover.empty) {
    return null;
  }

  const docSnap = leftover.docs[0];
  return { id: docSnap.id, data: snapshotData(docSnap) };
}

function buildReviewDocument(input, timestamp) {
  return {
    tutorId: input.tutorId,
    studentId: input.actorUid,
    bookingId: input.bookingId,
    rating: input.rating,
    comment: input.comment,
    createdAt: timestamp,
  };
}

async function createReviewForStudent(db, rawInput, deps = {}) {
  const input = validateReviewFields(rawInput);
  const leftover = await findExistingReviewForBooking(db, input.bookingId);
  if (leftover) {
    throw createCodedError("Esta aula já foi avaliada.", "DUPLICATE_REVIEW");
  }

  const bookingRef = db.collection("bookings").doc(input.bookingId);
  const reviewRef = db.collection("reviews").doc(input.bookingId);
  const timestamp = deps.timestamp ?? new Date();

  return db.runTransaction(async (tx) => {
    const bookingSnap = await tx.get(bookingRef);
    const reviewSnap = await tx.get(reviewRef);
    const booking = snapshotData(bookingSnap);

    assertCanCreateReview({
      actorUid: input.actorUid,
      booking,
      existingReview: Boolean(reviewSnap?.exists),
      tutorId: input.tutorId,
    });

    const payload = buildReviewDocument(
      {
        actorUid: input.actorUid,
        bookingId: input.bookingId,
        tutorId: booking.tutorId,
        rating: input.rating,
        comment: input.comment,
      },
      timestamp,
    );

    if (typeof tx.create === "function") {
      tx.create(reviewRef, payload);
    } else {
      tx.set(reviewRef, payload);
    }

    return {
      reviewId: input.bookingId,
      tutorId: booking.tutorId,
      bookingId: input.bookingId,
    };
  });
}

async function recomputeTutorRating(db, tutorId, deps = {}) {
  const id = typeof tutorId === "string" ? tutorId.trim() : "";
  if (!id || id.includes("/") || id.includes("..")) {
    throw createCodedError("Informe o identificador do professor.", "INVALID_TUTOR");
  }

  const reviewsSnap = await db.collection("reviews").where("tutorId", "==", id).get();
  const ratings = ratingsFromReviewDocs(reviewsSnap.docs);
  const { rating, reviewCount } = computeTutorRatingFromRatings(ratings);
  const timestamp = deps.timestamp ?? new Date();

  await db.collection("tutors").doc(id).update({
    rating,
    reviewCount,
    updatedAt: timestamp,
  });

  return { rating, reviewCount, tutorId: id };
}

async function createReviewAndRefreshTutorRating(db, rawInput, deps = {}) {
  const result = await createReviewForStudent(db, rawInput, deps);
  try {
    const stats = await recomputeTutorRating(db, result.tutorId, deps);
    return { ...result, rating: stats.rating, reviewCount: stats.reviewCount };
  } catch (error) {
    if (typeof deps.onRecomputeError === "function") {
      deps.onRecomputeError(error);
    }
    return result;
  }
}

function planReviewIdMigration(docs) {
  const byBooking = new Map();

  for (const docSnap of docs) {
    const bookingId = reviewDocumentId(docSnap.bookingId);
    if (!bookingId) {
      continue;
    }

    const entry = {
      id: docSnap.id,
      bookingId,
      createdAtMs: reviewCreatedAtMs(docSnap.createdAt),
    };

    const group = byBooking.get(bookingId) ?? [];
    group.push(entry);
    byBooking.set(bookingId, group);
  }

  const moves = [];
  const skippedExisting = [];
  const leftovers = [];

  for (const [bookingId, group] of byBooking) {
    const canonical = group.find((item) => item.id === bookingId);
    const others = group
      .filter((item) => item.id !== bookingId)
      .sort((a, b) => a.createdAtMs - b.createdAtMs);

    if (canonical) {
      skippedExisting.push({
        bookingId,
        reviewId: canonical.id,
        reason: "canonical_exists",
      });
      for (const leftover of others) {
        leftovers.push({
          bookingId,
          reviewId: leftover.id,
          reason: "leftover_after_canonical",
        });
      }
      continue;
    }

    const [source, ...extra] = others;
    if (!source) {
      continue;
    }

    moves.push({
      bookingId,
      sourceId: source.id,
      destId: bookingId,
    });
    for (const leftover of extra) {
      leftovers.push({
        bookingId,
        reviewId: leftover.id,
        reason: "extra_review_kept",
      });
    }
  }

  const skippedInvalid = docs
    .filter((docSnap) => !reviewDocumentId(docSnap.bookingId))
    .map((docSnap) => ({
      reviewId: docSnap.id,
      bookingId: docSnap.bookingId ?? null,
      reason: "invalid_booking_id",
    }));

  return { moves, skippedExisting, leftovers, skippedInvalid };
}

module.exports = {
  MAX_COMMENT_LENGTH,
  MAX_REVIEW_ID_LENGTH,
  REVIEW_ACTION_LABELS,
  REVIEW_ERROR_STATUS,
  VALID_RATINGS,
  assertCanCreateReview,
  computeTutorRatingFromRatings,
  createReviewAndRefreshTutorRating,
  createReviewForStudent,
  findExistingReviewForBooking,
  isValidRating,
  planReviewIdMigration,
  ratingsFromReviewDocs,
  recomputeTutorRating,
  reviewDocumentId,
  statusFromCreateReviewError,
  studentReviewAction,
  validateReviewFields,
};
