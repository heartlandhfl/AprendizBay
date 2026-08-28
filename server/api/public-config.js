"use strict";

const { Router } = require("express");

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

const publicConfigRouter = Router();

publicConfigRouter.get("/", (_req, res) => {
  const firebase = publicFirebaseConfig();
  res.json({
    firebase,
    configured: Boolean(String(firebase.apiKey).trim()),
  });
});

module.exports = { publicConfigRouter, publicFirebaseConfig };
