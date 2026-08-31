"use server";

/**
 * Server Actions — require a Next.js server host (e.g. Vercel).
 * On Hostinger (static hostinger-next/), these handlers do not run;
 * the live path is POST /api/tutors/review and POST /api/tutors/resubmit
 * (server/api/tutors.js), called from lib/tutors/review-client.ts.
 */
import { verifyAdminIdToken, verifyUserIdToken } from "@/lib/auth/admin-server";
import {
  resubmitTutorVerification,
  reviewTutorVerification,
} from "@/lib/tutors/admin-server";

export type ReviewTutorResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

export async function reviewTutorAction(
  idToken: string,
  tutorId: string,
  action: string,
  reason?: string,
): Promise<ReviewTutorResult> {
  try {
    const adminUid = await verifyAdminIdToken(idToken);
    const result = await reviewTutorVerification(tutorId, adminUid, action, reason);
    return { ok: true, status: result.status };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível atualizar a verificação.";
    return { ok: false, error: message };
  }
}

export async function approveTutorAction(
  idToken: string,
  tutorId: string,
): Promise<ReviewTutorResult> {
  return reviewTutorAction(idToken, tutorId, "approve");
}

export async function resubmitTutorAction(idToken: string): Promise<ReviewTutorResult> {
  try {
    const { uid } = await verifyUserIdToken(idToken);
    const result = await resubmitTutorVerification(uid);
    return { ok: true, status: result.status };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível reenviar a verificação.";
    return { ok: false, error: message };
  }
}
