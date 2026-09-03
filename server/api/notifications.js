"use strict";

const express = require("express");
const { Router } = require("express");
const { getAdminFirestore, readBearerToken, verifyIdToken } = require("./firebase-admin");

require("tsx/cjs");

const {
  dispatchNotification,
  notifyLessonReminders,
} = require("../../lib/notifications/server.ts");

function isAuthorizedCron(req) {
  const secret = String(
    process.env.NOTIFICATIONS_CRON_SECRET || process.env.CRON_SECRET || "",
  ).trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return req.get("authorization") === `Bearer ${secret}`;
}

const notificationsRouter = Router();
notificationsRouter.use(express.json({ limit: "32kb" }));

notificationsRouter.post("/", async (req, res) => {
  try {
    const { uid } = await verifyIdToken(readBearerToken(req));
    const {
      authorizeNotificationRequest,
      NotificationAuthorizationError,
    } = require("../../lib/notifications/authorize.ts");
    const { getAdminFirestore } = require("./firebase-admin");
    await authorizeNotificationRequest(getAdminFirestore(), uid, req.body);
    const result = await dispatchNotification(req.body);
    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar o e-mail.";
    const status =
      error?.name === "NotificationAuthorizationError"
        ? 403
        : message.includes("Token") ||
            message.includes("autenticação") ||
            message.includes("id-token") ||
            message.includes("Decoding Firebase ID token")
          ? 401
          : message.includes("Firebase Admin")
            ? 503
            : message.includes("Informe") || message.includes("inválido")
              ? 400
              : 500;
    res.status(status).json({ error: message });
  }
});

notificationsRouter.post("/reminders", async (req, res) => {
  if (!isAuthorizedCron(req)) {
    res.status(401).json({ error: "Cron não autorizado." });
    return;
  }

  try {
    const result = await notifyLessonReminders();
    res.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar os lembretes.";
    const status = message.includes("Firebase Admin") ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

notificationsRouter.get("/reminders", async (req, res) => {
  if (!isAuthorizedCron(req)) {
    res.status(401).json({ error: "Cron não autorizado." });
    return;
  }

  try {
    const result = await notifyLessonReminders();
    res.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar os lembretes.";
    const status = message.includes("Firebase Admin") ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

module.exports = {
  dispatchNotification: async (_db, body) => dispatchNotification(body),
  isAuthorizedCron,
  notificationsRouter,
  notifyLessonReminders: async () => notifyLessonReminders(),
};
