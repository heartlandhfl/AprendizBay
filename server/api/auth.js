"use strict";

const { Router } = require("express");
const { syncSignupRoleFromProfile } = require("../../lib/auth/role-server.js");
const { readBearerToken, verifyIdToken } = require("./firebase-admin");
const { captureException } = require("./sentry");

const authRouter = Router();

/**
 * Hostinger Express counterpart to POST /api/auth/sync-signup-role
 * (app/api/auth/sync-signup-role on Vercel / next start).
 */
authRouter.post("/sync-signup-role", async (req, res) => {
  try {
    const { uid } = await verifyIdToken(readBearerToken(req));
    const role = await syncSignupRoleFromProfile(uid);
    res.json({ ok: true, role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar papel.";
    const status = message.includes("Token") || message.includes("autenticação") ? 401 : 500;
    if (status === 500) {
      captureException(error);
    }
    res.status(status).json({ error: message });
  }
});

module.exports = { authRouter };
