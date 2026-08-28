"use server";

/**
 * Server Action — requires a Next.js server host. On Hostinger (static hostinger-next/
 * HTML only), this POST handler never runs; tutor ratings are not recomputed after reviews.
 * Use Vercel or a future Express API to restore recomputeTutorRating.
 */
import { recomputeTutorRating } from "@/lib/reviews/server";

export async function recomputeTutorRatingAction(tutorId: string): Promise<void> {
  await recomputeTutorRating(tutorId);
}
