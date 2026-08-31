"use strict";

const express = require("express");
const { Router } = require("express");
const { deleteUserAccount } = require("../../lib/account/anonymize");
const {
  getAdminApp,
  getAdminFirestore,
  readBearerToken,
  verifyIdToken,
} = require("./firebase-admin");

/**
 * Hostinger Express counterpart to POST /api/account/delete
 * (app/api/account/delete on Vercel / next start).
 */
async function deleteAuthenticatedAccount(uid) {
  const { FieldValue } = require("firebase-admin/firestore");
  const { getAuth } = require("firebase-admin/auth");
  const app = getAdminApp();
  const db = getAdminFirestore();

  async function deleteStoragePrefixes(prefixes) {
    const { getStorage } = require("firebase-admin/storage");
    const bucket = getStorage(app).bucket();
    await Promise.all(prefixes.map((prefix) => bucket.deleteFiles({ prefix })));
  }

  return deleteUserAccount(
    {
      db,
      FieldValue,
      deleteAuthUser: (targetUid) => getAuth(app).deleteUser(targetUid),
      deleteStoragePrefixes,
    },
    uid,
  );
}

const accountRouter = Router();
accountRouter.use(express.json({ limit: "8kb" }));

accountRouter.post("/delete", async (req, res) => {
  try {
    const { uid } = await verifyIdToken(readBearerToken(req));
    const summary = await deleteAuthenticatedAccount(uid);
    res.json({ ok: true, ...summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível excluir a conta.";
    const code = error && typeof error === "object" ? error.code : undefined;
    const status =
      code === "ACTIVE_PAID_BOOKINGS"
        ? 409
        : code === "ADMIN_ACCOUNT"
          ? 403
          : message.includes("Token") ||
              message.includes("autenticação") ||
              message.includes("id-token") ||
              message.includes("Decoding Firebase ID token")
            ? 401
            : message.includes("Firebase Admin")
              ? 503
              : 500;
    res.status(status).json({ error: message });
  }
});

module.exports = {
  accountRouter,
  deleteAuthenticatedAccount,
};
