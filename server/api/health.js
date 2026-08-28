"use strict";

const { Router } = require("express");

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "aprendiz-bay",
    mode: "express",
  });
});

module.exports = { healthRouter };
