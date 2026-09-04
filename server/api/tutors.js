"use strict";

const express = require("express");
const { Router } = require("express");
const {
  applyAdminVerificationReview,
  applyTutorVerificationResubmit,
} = require("../../lib/tutors/verification");
const { writeAdminAuditLogSafe } = require("../../lib/admin/audit");
const { assertAdminFromClaims } = require("../../lib/admin/authorize");
const { roleFromDecodedToken } = require("../../lib/auth/role-server.js");
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
 *   GET  /api/tutors/me/earnings
 * (app/api/tutors/* on Vercel / next start).
 */

async function requireAdminUid(idToken) {
  const { uid, customClaims } = await verifyIdToken(idToken);
  assertAdminFromClaims(customClaims);
  return uid;
}

async function requireTutorUid(idToken) {
  const { uid, customClaims } = await verifyIdToken(idToken);
  const claimRole = roleFromDecodedToken(customClaims);
  const snapshot = await getAdminFirestore().collection("users").doc(uid).get();
  const profileRole = snapshot.exists ? snapshot.data()?.role : null;
  const isLecturer =
    claimRole === "lecturer" || profileRole === "tutor" || profileRole === "lecturer";

  if (!isLecturer) {
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

    const db = getAdminFirestore();
    const result = await applyAdminVerificationReview(
      { db, FieldValue },
      { tutorId, adminUid, action, reason },
    );

    await writeAdminAuditLogSafe(
      { db, FieldValue },
      {
        actorUid: adminUid,
        action: "tutor_review",
        targetType: "tutor",
        targetId: tutorId,
        metadata: {
          reviewAction: action,
          status: result.status,
          previousStatus: result.previousStatus,
        },
      },
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

function summarizeTutorPayouts(records) {
  const summary = {
    paidTotal: 0,
    pendingTotal: 0,
    processingTotal: 0,
    paidCount: 0,
    pendingCount: 0,
    processingCount: 0,
  };

  for (const record of records) {
    const amount =
      typeof record?.amount === "number" && Number.isFinite(record.amount) && record.amount >= 0
        ? Math.round(record.amount * 100) / 100
        : 0;
    if (record?.status === "paid") {
      summary.paidTotal = Math.round((summary.paidTotal + amount) * 100) / 100;
      summary.paidCount += 1;
    } else if (record?.status === "pending") {
      summary.pendingTotal = Math.round((summary.pendingTotal + amount) * 100) / 100;
      summary.pendingCount += 1;
    } else if (record?.status === "processing") {
      summary.processingTotal = Math.round((summary.processingTotal + amount) * 100) / 100;
      summary.processingCount += 1;
    }
  }

  return summary;
}

tutorsRouter.get("/me/earnings", async (req, res) => {
  try {
    const tutorId = await requireTutorUid(readBearerToken(req));
    const snapshot = await getAdminFirestore()
      .collection("tutorPayouts")
      .where("tutorId", "==", tutorId)
      .get();
    const earnings = summarizeTutorPayouts(snapshot.docs.map((doc) => doc.data()));
    res.json({ ok: true, earnings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar os ganhos.";
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
