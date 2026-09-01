"use strict";

/**
 * Lazy Firebase Admin bootstrap for Express (`server/api/` only).
 *
 * Hostinger production now loads firebase-admin when a route here needs it
 * (review create and admin rating recompute). Next.js server modules under lib/ still must not
 * be required from Express — this file is the Express-safe entry.
 */

let adminApp;
let initialized = false;

function hasFirebaseAdminConfig() {
  return Boolean(
    String(process.env.FIREBASE_ADMIN_PROJECT_ID || "").trim() &&
      String(process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "").trim() &&
      String(process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").trim(),
  );
}

function isFirebaseAdminInitialized() {
  return initialized;
}

function getAdminApp() {
  if (adminApp) {
    return adminApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK requires FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  const { cert, getApps, initializeApp } = require("firebase-admin/app");

  adminApp =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
  initialized = true;
  return adminApp;
}

function getAdminFirestore() {
  const { getFirestore } = require("firebase-admin/firestore");
  return getFirestore(getAdminApp());
}

async function verifyIdToken(idToken) {
  if (!String(idToken || "").trim()) {
    throw new Error("Token de autenticação ausente.");
  }

  const { getAuth } = require("firebase-admin/auth");
  const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email,
  };
}

function readBearerToken(req) {
  const header = req.get("authorization") || "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

module.exports = {
  getAdminApp,
  getAdminFirestore,
  hasFirebaseAdminConfig,
  isFirebaseAdminInitialized,
  readBearerToken,
  verifyIdToken,
};
