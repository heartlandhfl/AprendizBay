"use strict";

const { Router } = require("express");
const { accountRouter } = require("./account");
const { adminRouter } = require("./admin");
const { bookingsRouter } = require("./bookings");
const { healthRouter } = require("./health");
const { hubsRouter } = require("./hubs");
const { publicConfigRouter } = require("./public-config");
const { reviewsRouter } = require("./reviews");
const { notificationsRouter } = require("./notifications");
const { tutorsRouter } = require("./tutors");

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

apiRouter.use("/account", accountRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/bookings", bookingsRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/hubs", hubsRouter);
apiRouter.use("/public-config", publicConfigRouter);
apiRouter.use("/reviews", reviewsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/tutors", tutorsRouter);

module.exports = { apiRouter };
