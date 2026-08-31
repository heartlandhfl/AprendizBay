"use strict";

const { Router } = require("express");
const { buildAdminOperationsDashboard } = require("../../lib/admin/dashboard");
const { statusFromAdminError } = require("../../lib/admin/authorize");
const { requireAdminUid } = require("./authorize");
const { getAdminFirestore, readBearerToken } = require("./firebase-admin");
const { captureException } = require("./sentry");

/**
 * Hostinger Express counterpart to:
 *   GET /api/admin/dashboard
 * (app/api/admin/dashboard on Vercel / next start).
 */

const adminRouter = Router();

adminRouter.get("/dashboard", async (req, res) => {
  try {
    await requireAdminUid(readBearerToken(req));
    const dashboard = await buildAdminOperationsDashboard({
      db: getAdminFirestore(),
    });
    res.json({ ok: true, dashboard });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar o painel.";
    const status = statusFromAdminError(error);
    if (status >= 500) {
      captureException(error);
    }
    res.status(status).json({ error: message });
  }
});

module.exports = {
  adminRouter,
};
