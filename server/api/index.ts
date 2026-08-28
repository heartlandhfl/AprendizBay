import { Router } from "express";
import { healthRouter } from "./health";

/**
 * Express API for this app. Add routers here — they are mounted at `/api`
 * and take precedence over Next.js pages.
 *
 * Example:
 *   apiRouter.use("/bookings", bookingsRouter);
 *   // POST https://your-domain/api/bookings
 */
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
