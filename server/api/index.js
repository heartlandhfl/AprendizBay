"use strict";

const { Router } = require("express");
const { healthRouter } = require("./health");
const { publicConfigRouter } = require("./public-config");

/**
 * Express API for this app. Add routers here — they are mounted at `/api`
 * and take precedence over Next.js pages. In development, unmatched `/api`
 * paths (e.g. /api/payments/*) are forwarded to the Next.js App Router.
 *
 * Example:
 *   apiRouter.use("/bookings", bookingsRouter);
 *   // POST https://your-domain/api/bookings
 */
const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/public-config", publicConfigRouter);

module.exports = { apiRouter };
