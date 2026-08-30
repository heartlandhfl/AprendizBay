"use server";

/**
 * Server Action — works natively on Vercel / next start.
 * Production Hostinger serves static hostinger-next/ HTML via Express, so this
 * POST handler never runs there. The live path is POST /api/reviews/recompute-rating
 * (server/api/reviews.js), called from lib/reviews/client.ts after createReview.
 */
import { recomputeTutorRating } from "@/lib/reviews/server";

export async function recomputeTutorRatingAction(tutorId: string): Promise<void> {
  await recomputeTutorRating(tutorId);
}
