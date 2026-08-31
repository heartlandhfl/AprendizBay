"use strict";

const express = require("express");
const { Router } = require("express");
const {
  completeLessonForActor,
  statusFromCompleteLessonError,
} = require("../../lib/bookings/complete-lesson");
const {
  loadTutorOccupiedStarts,
  normalizeTutorId,
  occupancyResponse,
} = require("../../lib/bookings/occupancy");
const { getAdminFirestore, readBearerToken, verifyIdToken } = require("./firebase-admin");
const { captureException } = require("./sentry");

const bookingsRouter = Router();
bookingsRouter.use(express.json({ limit: "16kb" }));

bookingsRouter.post("/complete", async (req, res) => {
  try {
    const { uid } = await verifyIdToken(readBearerToken(req));
    const db = getAdminFirestore();
    const { FieldValue } = require("firebase-admin/firestore");
    const result = await completeLessonForActor(
      db,
      {
        actorUid: uid,
        bookingId: req.body?.bookingId,
      },
      { timestamp: FieldValue.serverTimestamp() },
    );
    res.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível marcar a aula como concluída.";
    const status = statusFromCompleteLessonError(error);
    if (status >= 500) {
      captureException(error);
    }
    res.status(status).json({ error: message });
  }
});

/**
 * Public occupancy for the individual slot picker.
 * Returns ISO start times only — never student, payment, or booking identity.
 */
bookingsRouter.get("/occupancy", async (req, res) => {
  const tutorId = normalizeTutorId(req.query?.tutorId);

  if (!tutorId) {
    res.status(400).json({ error: "Informe o identificador do professor." });
    return;
  }

  try {
    const occupiedStarts = await loadTutorOccupiedStarts(getAdminFirestore(), tutorId);
    res.json(occupancyResponse(occupiedStarts));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível verificar horários já reservados.";
    const status = message.includes("Firebase Admin") ? 503 : 500;
    if (status >= 500) {
      captureException(error);
    }
    res.status(status).json({
      error:
        status === 503
          ? "A verificação de horários não está disponível no momento."
          : "Não foi possível verificar horários já reservados.",
    });
  }
});

module.exports = { bookingsRouter };
