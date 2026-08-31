"use strict";

const express = require("express");
const { Router } = require("express");
const {
  applyAdminVerificationReview,
  applyTutorVerificationResubmit,
} = require("../../lib/tutors/verification");
const {
  getAdminFirestore,
  readBearerToken,
  verifyIdToken,
} = require("./firebase-admin");
const { captureException } = require("./sentry");

/**
 * Hostinger Express counterpart to:
 *   POST /api/tutors/review
 *   POST /api/tutors/resubmit
 * (app/api/tutors/* on Vercel / next start).
 */

async function requireAdminUid(idToken) {
  const { uid } = await verifyIdToken(idToken);
  const snapshot = await getAdminFirestore().collection("users").doc(uid).get();
  if (!snapshot.exists || snapshot.data()?.role !== "admin") {
    const error = new Error("Acesso restrito a administradores.");
    error.code = "FORBIDDEN";
    throw error;
  }
  return uid;
}

async function requireTutorUid(idToken) {
  const { uid } = await verifyIdToken(idToken);
  const snapshot = await getAdminFirestore().collection("users").doc(uid).get();
  if (!snapshot.exists || snapshot.data()?.role !== "tutor") {
    const error = new Error("Apenas professores podem reenviar a verificação.");
    error.code = "FORBIDDEN";
    throw error;
  }
  return uid;
}

function statusFromError(error) {
  const code = error && typeof error === "object" ? error.code : undefined;
  const message = error instanceof Error ? error.message : "";

  if (code === "FORBIDDEN" || code === "SELF_REVIEW") {
    return 403;
  }
  if (code === "NOT_FOUND") {
    return 404;
  }
  if (
    code === "INVALID_ACTION" ||
    code === "INVALID_TRANSITION" ||
    code === "REASON_REQUIRED" ||
    code === "INVALID_TUTOR"
  ) {
    return 400;
  }
  if (
    message.includes("Token") ||
    message.includes("autenticação") ||
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

const tutorsRouter = Router();
tutorsRouter.use(express.json({ limit: "16kb" }));

tutorsRouter.post("/review", async (req, res) => {
  try {
    const adminUid = await requireAdminUid(readBearerToken(req));
    const tutorId = typeof req.body?.tutorId === "string" ? req.body.tutorId.trim() : "";
    const action = typeof req.body?.action === "string" ? req.body.action.trim() : "";
    const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
    const { FieldValue } = require("firebase-admin/firestore");

    const result = await applyAdminVerificationReview(
      { db: getAdminFirestore(), FieldValue },
      { tutorId, adminUid, action, reason },
    );

    res.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível atualizar a verificação.";
    const status = statusFromError(error);
    if (status >= 500) {
      captureException(error);
    }
    res.status(status).json({ error: message });
  }
});

tutorsRouter.post("/resubmit", async (req, res) => {
  try {
    const tutorId = await requireTutorUid(readBearerToken(req));
    const { FieldValue } = require("firebase-admin/firestore");

    const result = await applyTutorVerificationResubmit(
      { db: getAdminFirestore(), FieldValue },
      { tutorId },
    );

    res.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível reenviar a verificação.";
    const status = statusFromError(error);
    if (status >= 500) {
      captureException(error);
    }
    res.status(status).json({ error: message });
  }
});

module.exports = {
  requireAdminUid,
  requireTutorUid,
  statusFromError,
  tutorsRouter,
};
