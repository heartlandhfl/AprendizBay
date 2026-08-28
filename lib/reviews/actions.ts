"use server";

import { recomputeTutorRating } from "@/lib/reviews/server";

export async function recomputeTutorRatingAction(tutorId: string): Promise<void> {
  await recomputeTutorRating(tutorId);
}
