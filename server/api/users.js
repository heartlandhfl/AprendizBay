"use strict";

const express = require("express");
const { Router } = require("express");
const { readOrBackfillPublicProfile } = require("../../lib/users/public-profile-server");
const { getAdminFirestore, readBearerToken, verifyIdToken } = require("./firebase-admin");
const { captureException } = require("./sentry");

const usersRouter = Router();
usersRouter.use(express.json({ limit: "4kb" }));

function normalizeUid(value) {
  return typeof value === "string" ? value.trim() : "";
}

usersRouter.get("/public-profile/:uid", async (req, res) => {
  const uid = normalizeUid(req.params.uid);
  if (!uid) {
    res.status(400).json({ error: "Informe o identificador do usuário." });
    return;
  }

  try {
    await verifyIdToken(readBearerToken(req));
    const { FieldValue } = require("firebase-admin/firestore");
    const profile = await readOrBackfillPublicProfile(
      getAdminFirestore(),
      uid,
      FieldValue,
    );

    if (!profile) {
      res.status(404).json({ error: "Conta encerrada." });
      return;
    }

    res.json({
      displayName: profile.displayName,
      photoUrl: profile.photoUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Token de autenticação") || message.includes("auth/")) {
      res.status(401).json({ error: "Faça login para continuar." });
      return;
    }

    captureException(error);
    res.status(500).json({ error: "Não foi possível carregar o nome do participante." });
  }
});

module.exports = { usersRouter };
