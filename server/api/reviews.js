"use strict";

const express = require("express");
const { Router } = require("express");
const {
  computeTutorRatingFromRatings,
  createReviewAndRefreshTutorRating,
  recomputeTutorRating,
  statusFromCreateReviewError,
} = require("../../lib/reviews/create-review");
const { requireAdminUid } = require("./authorize");
const { statusFromAdminError } = require("../../lib/admin/authorize");
const {
  getAdminFirestore,
  readBearerToken,
  verifyIdToken,
} = require("./firebase-admin");
const { captureException } = require("./sentry");

function createReviewsRouter(deps = {}) {
  const verifyCaller = deps.verifyIdToken || verifyIdToken;
  const requireAdmin = deps.requireAdminUid || requireAdminUid;
  const getDb = deps.getAdminFirestore || getAdminFirestore;
  const onRecomputeError = deps.onRecomputeError || captureException;
  const timestamp = () => {
    if (deps.timestamp !== undefined) {
      return deps.timestamp;
    }
    const { FieldValue } = require("firebase-admin/firestore");
    return FieldValue.serverTimestamp();
  };

  const reviewsRouter = Router();
  reviewsRouter.use(express.json({ limit: "32kb" }));

  reviewsRouter.post("/", async (req, res) => {
    try {
      const { uid } = await verifyCaller(readBearerToken(req));
      const db = getDb();
      const result = await createReviewAndRefreshTutorRating(
        db,
        {
          actorUid: uid,
          bookingId: req.body?.bookingId,
          tutorId: req.body?.tutorId,
          rating: req.body?.rating,
          comment: req.body?.comment,
        },
        {
          timestamp: timestamp(),
          onRecomputeError,
        },
      );

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
      await requireAdmin(readBearerToken(req));

      const tutorId =
        typeof req.body?.tutorId === "string" ? req.body.tutorId.trim() : "";
      if (!tutorId) {
        res.status(400).json({ error: "Informe o identificador do professor." });
        return;
      }

      const db = getDb();
      const stats = await recomputeTutorRating(db, tutorId, {
        timestamp: timestamp(),
      });
      res.json({ ok: true, ...stats });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a nota do professor.";
      const status = statusFromAdminError(error);
      if (status >= 500) {
        captureException(error);
      }
      res.status(status).json({ error: message });
    }
  });

  return reviewsRouter;
}

const reviewsRouter = createReviewsRouter();

module.exports = {
  computeTutorRatingFromRatings,
  createReviewsRouter,
  recomputeTutorRating,
  reviewsRouter,
};
