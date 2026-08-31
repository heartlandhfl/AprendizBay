"use strict";

const express = require("express");
const { Router } = require("express");
const {
  computeTutorRatingFromRatings,
  createReviewForStudent,
  ratingsFromReviewDocs,
  statusFromCreateReviewError,
} = require("../../lib/reviews/create-review");
const {
  getAdminFirestore,
  readBearerToken,
  verifyIdToken,
} = require("./firebase-admin");
const { captureException } = require("./sentry");

/**
 * Recompute tutors/{tutorId}.rating and reviewCount from reviews.
 * Mirrors lib/reviews/server.ts for the Hostinger Express path.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} tutorId
 */
async function recomputeTutorRating(db, tutorId) {
  const reviewsSnap = await db
    .collection("reviews")
    .where("tutorId", "==", tutorId)
    .get();

  const ratings = ratingsFromReviewDocs(reviewsSnap.docs);
  const { rating, reviewCount } = computeTutorRatingFromRatings(ratings);
  const { FieldValue } = require("firebase-admin/firestore");

  await db.collection("tutors").doc(tutorId).update({
    rating,
    reviewCount,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { rating, reviewCount };
}

const reviewsRouter = Router();
reviewsRouter.use(express.json({ limit: "32kb" }));

reviewsRouter.post("/", async (req, res) => {
  try {
    const { uid } = await verifyIdToken(readBearerToken(req));
    const db = getAdminFirestore();
    const { FieldValue } = require("firebase-admin/firestore");
    const result = await createReviewForStudent(
      db,
      {
        actorUid: uid,
        bookingId: req.body?.bookingId,
        tutorId: req.body?.tutorId,
        rating: req.body?.rating,
        comment: req.body?.comment,
      },
      { timestamp: FieldValue.serverTimestamp() },
    );

    try {
      await recomputeTutorRating(db, result.tutorId);
    } catch (recomputeError) {
      captureException(recomputeError);
    }

    res.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar a avaliação.";
    const status = statusFromCreateReviewError(error);
    if (status >= 500) {
      captureException(error);
    }
    res.status(status).json({ error: message });
  }
});

reviewsRouter.post("/recompute-rating", async (req, res) => {
  try {
    const tutorId =
      typeof req.body?.tutorId === "string" ? req.body.tutorId.trim() : "";
    if (!tutorId) {
      res.status(400).json({ error: "Informe o identificador do professor." });
      return;
    }

    await verifyIdToken(readBearerToken(req));
    const db = getAdminFirestore();
    const stats = await recomputeTutorRating(db, tutorId);
    res.json({ ok: true, ...stats });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a nota do professor.";
    const status =
      message.includes("Token") ||
      message.includes("autenticação") ||
      message.includes("id-token") ||
      message.includes("Decoding Firebase ID token")
        ? 401
        : message.includes("Firebase Admin")
          ? 503
          : 500;
    if (status >= 500) {
      captureException(error);
    }
    res.status(status).json({ error: message });
  }
});

module.exports = {
  computeTutorRatingFromRatings,
  recomputeTutorRating,
  reviewsRouter,
};
