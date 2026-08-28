"use strict";

const { Router } = require("express");
const { healthRouter } = require("./health");

/**
 * Express API for this app. Add routers here — they are mounted at `/api`
 * and take precedence over Next.js pages.
 *
 * Example:
 *   apiRouter.use("/bookings", bookingsRouter);
 *   // POST https://your-domain/api/bookings
 */
const apiRouter = Router();

apiRouter.use("/health", healthRouter);

module.exports = { apiRouter };
