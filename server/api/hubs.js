"use strict";

const express = require("express");
const { Router } = require("express");
const {
  createCollectiveBookingForStudent,
  statusFromJoinAndBookError,
} = require("../../lib/hubs/join-and-book");
const { getAdminFirestore, readBearerToken, verifyIdToken } = require("./firebase-admin");
const { captureException } = require("./sentry");

const hubsRouter = Router();
hubsRouter.use(express.json({ limit: "16kb" }));

hubsRouter.post("/join", async (req, res) => {
  try {
    const { uid } = await verifyIdToken(readBearerToken(req));
    const db = getAdminFirestore();
    const { FieldValue } = require("firebase-admin/firestore");
    const result = await createCollectiveBookingForStudent(
      db,
      {
        actorUid: uid,
        hubId: req.body?.hubId,
      },
      { timestamp: FieldValue.serverTimestamp(), deleteField: FieldValue.delete() },
    );
    res.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível entrar nesta turma.";
    const status = statusFromJoinAndBookError(error);
    if (status >= 500) {
      captureException(error);
    }
    res.status(status).json({
      error: message,
      code: error && typeof error === "object" ? error.code : undefined,
    });
  }
});

module.exports = { hubsRouter };
