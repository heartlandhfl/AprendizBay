"use strict";

require("tsx/cjs");

const { Router } = require("express");
const { buildAdminOperationsDashboard } = require("../../lib/admin/dashboard");
const { buildEmailDiagnosticsPayload } = require("../../lib/admin/email-diagnostics.ts");
const { statusFromAdminError } = require("../../lib/admin/authorize");
const { requireAdminUid } = require("./authorize");
const { getAdminFirestore, readBearerToken } = require("./firebase-admin");
const { captureException } = require("./sentry");

const { JetSendApiError } = require("../../lib/jetsend/client.ts");
const {
  createSendingDomain,
  listSendingDomains,
  validateSendingDomainInput,
} = require("../../lib/jetsend/sending-domains.ts");

/**
 * Hostinger Express counterpart to:
 *   GET /api/admin/dashboard
 *   GET /api/admin/email-diagnostics
 *   GET|POST /api/admin/jetsend/sending-domains
 * (app/api/admin/* on Vercel / next start).
 */

const adminRouter = Router();
adminRouter.use(require("express").json({ limit: "16kb" }));

function mapJetSendError(error) {
  if (error instanceof JetSendApiError) {
    if (error.details.code === "missing_api_key") {
      return {
        status: 503,
        message:
          "JetSend não está configurado no servidor. Defina JET_SEND_API_KEY nas variáveis de ambiente.",
      };
    }

    if (error.details.status === 401) {
      const jetsendDetail = error.details.body.slice(0, 400);
      return {
        status: 502,
        message:
          "JetSend recusou a autenticação. Verifique se JET_SEND_API_KEY está correto no servidor.",
        jetsendDetail: jetsendDetail || undefined,
      };
    }

    return {
      status:
        error.details.status >= 400 && error.details.status < 600
          ? error.details.status
          : 502,
      message: "Não foi possível consultar o JetSend. Tente novamente em instantes.",
    };
  }

  if (error instanceof Error) {
    return { status: 400, message: error.message };
  }

  return { status: 500, message: "Não foi possível consultar o JetSend." };
}

function sendJetSendErrorResponse(res, mapped) {
  res.status(mapped.status).json({
    error: mapped.message,
    ...(mapped.jetsendDetail ? { jetsendDetail: mapped.jetsendDetail } : {}),
  });
}

adminRouter.get("/email-diagnostics", async (req, res) => {
  try {
    await requireAdminUid(readBearerToken(req));
    res.json(buildEmailDiagnosticsPayload());
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar o diagnóstico de e-mail.";
    const status = statusFromAdminError(error);
    if (status >= 500) {
      captureException(error);
    }
    res.status(status).json({ error: message });
  }
});

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

adminRouter.get("/jetsend/sending-domains", async (req, res) => {
  try {
    await requireAdminUid(readBearerToken(req));
    const domains = await listSendingDomains();
    res.json({ ok: true, domains });
  } catch (error) {
    if (!(error instanceof JetSendApiError) && error instanceof Error) {
      res.status(statusFromAdminError(error)).json({ error: error.message });
      return;
    }
    const mapped = mapJetSendError(error);
    sendJetSendErrorResponse(res, mapped);
  }
});

adminRouter.post("/jetsend/sending-domains", async (req, res) => {
  try {
    await requireAdminUid(readBearerToken(req));

    const domain = String(req.body?.domain ?? "");
    const validationError = validateSendingDomainInput(domain);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const created = await createSendingDomain(domain);
    res.json({ ok: true, domain: created });
  } catch (error) {
    if (!(error instanceof JetSendApiError) && error instanceof Error) {
      res.status(statusFromAdminError(error)).json({ error: error.message });
      return;
    }
    const mapped = mapJetSendError(error);
    sendJetSendErrorResponse(res, mapped);
  }
});

module.exports = {
  adminRouter,
};
