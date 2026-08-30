"use strict";

const express = require("express");
const { Router } = require("express");
const {
  getAdminFirestore,
  readBearerToken,
  verifyIdToken,
} = require("./firebase-admin");

/**
 * Average tutor rating from review scores. Shared with scripts/test-reviews-api.js.
 * @param {number[]} ratings
 * @returns {{ rating: number, reviewCount: number }}
 */
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

  const ratings = reviewsSnap.docs.map((docSnap) => docSnap.data().rating);
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
    res.status(status).json({ error: message });
  }
});

module.exports = {
  computeTutorRatingFromRatings,
  recomputeTutorRating,
  reviewsRouter,
};
