"use strict";

const { Router } = require("express");
const {
  loadTutorOccupiedStarts,
  normalizeTutorId,
  occupancyResponse,
} = require("../../lib/bookings/occupancy");
const { getAdminFirestore } = require("./firebase-admin");
const { captureException } = require("./sentry");

const bookingsRouter = Router();

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
