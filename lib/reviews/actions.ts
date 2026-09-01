"use server";

/**
 * Server Action — works natively on Vercel / next start.
 * Production Hostinger serves static hostinger-next/ HTML via Express, so this
 * POST handler never runs there.
 *
 * Rating recomputation is not a public student or tutor action. A valid
 * review updates the tutor through POST /api/reviews. Admins recalculate
 * through POST /api/reviews/recompute-rating after verifying admin role.
 */
export async function recomputeTutorRatingAction(): Promise<never> {
  throw new Error("A recálculo de nota é restrito a administradores.");
}
