"use strict";

const { Router } = require("express");

const DEFAULT_PLATFORM_FEE_PERCENT = 10;

function publicFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
}

function parsePlatformFeePercent(value) {
  if (value == null || value === "") {
    return DEFAULT_PLATFORM_FEE_PERCENT;
  }

  const parsed = Number.parseFloat(String(value).trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return DEFAULT_PLATFORM_FEE_PERCENT;
  }

  return parsed;
}

function publicPlatformFeePercent() {
  return parsePlatformFeePercent(
    process.env.PLATFORM_FEE_PERCENT ?? process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT,
  );
}

const publicConfigRouter = Router();

publicConfigRouter.get("/", (_req, res) => {
  const firebase = publicFirebaseConfig();
  res.json({
    firebase,
    configured: Boolean(String(firebase.apiKey).trim()),
    platformFeePercent: publicPlatformFeePercent(),
  });
});

module.exports = {
  publicConfigRouter,
  publicFirebaseConfig,
  publicPlatformFeePercent,
  parsePlatformFeePercent,
};
