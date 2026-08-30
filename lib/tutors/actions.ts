"use server";

/**
 * Server Actions — require a Next.js server host (e.g. Vercel).
 * On Hostinger (static hostinger-next/), approve POST handlers do not run;
 * promote tutors manually in the Firestore console or deploy to Vercel.
 */
import { verifyAdminIdToken } from "@/lib/auth/admin-server";
import { verifyTutorProfile } from "@/lib/tutors/admin-server";

export type ApproveTutorResult =
  | { ok: true }
  | { ok: false; error: string };

export async function approveTutorAction(
  idToken: string,
  tutorId: string,
): Promise<ApproveTutorResult> {
  try {
    await verifyAdminIdToken(idToken);
    await verifyTutorProfile(tutorId);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível aprovar o professor.";
    return { ok: false, error: message };
  }
}
