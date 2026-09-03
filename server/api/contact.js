"use strict";

const express = require("express");
const { Router } = require("express");

require("tsx/cjs");

const { sendContactMessage } = require("../../lib/contact/send-contact-message.ts");

const contactRouter = Router();
contactRouter.use(express.json({ limit: "32kb" }));

contactRouter.post("/", async (req, res) => {
  try {
    const result = await sendContactMessage({
      name: req.body?.name,
      email: req.body?.email,
      message: req.body?.message,
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("[Aprendiz Bay] POST /api/contact failed:", error);
    res.status(500).json({ error: "Não foi possível enviar sua mensagem. Tente novamente." });
  }
});

module.exports = { contactRouter };
