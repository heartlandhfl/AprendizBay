"use strict";

const express = require("express");
const { Router } = require("express");

require("tsx/cjs");

const { sendContactMessage } = require("../../lib/contact/send-contact-message.ts");
const { persistContactMessage } = require("../../lib/contact/persist-contact-message.ts");
const { getAdminFirestore, hasFirebaseAdminConfig } = require("./firebase-admin");

function createPersistFallback() {
  if (!hasFirebaseAdminConfig()) {
    return undefined;
  }

  return async (input, meta) => {
    await persistContactMessage(getAdminFirestore(), input, meta);
    return true;
  };
}

const contactRouter = Router();
contactRouter.use(express.json({ limit: "32kb" }));

contactRouter.post("/", async (req, res) => {
  try {
    const result = await sendContactMessage(
      {
        name: req.body?.name,
        email: req.body?.email,
        message: req.body?.message,
      },
      { persistFallback: createPersistFallback() },
    );

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json({ ok: true, delivery: result.delivery });
  } catch (error) {
    console.error("[Aprendiz Bay] POST /api/contact failed:", error);
    res.status(500).json({ error: "Não foi possível enviar sua mensagem. Tente novamente." });
  }
});

module.exports = { contactRouter };
