/**
 * Hostinger audit — firebase-admin (Next.js server modules only)
 *
 * Tutor verification for admin review and tutor resubmit. Called from
 * lib/tutors/actions.ts and app/api/tutors/*. Not imported by server.js
 * or server/api/ — Express uses server/api/tutors.js.
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { writeAdminAuditLogSafe } from "@/lib/admin/audit";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  applyAdminVerificationReview,
  applyTutorVerificationResubmit,
} from "@/lib/tutors/verification";

export async function reviewTutorVerification(
  tutorId: string,
  adminUid: string,
  action: string,
  reason?: string,
) {
  const db = getFirestore(getAdminApp());
  const result = await applyAdminVerificationReview(
    { db, FieldValue },
    { tutorId, adminUid, action, reason },
  );

  await writeAdminAuditLogSafe(
    { db, FieldValue },
    {
      actorUid: adminUid,
      action: "tutor_review",
      targetType: "tutor",
      targetId: tutorId,
      metadata: {
        reviewAction: action,
        status: result.status,
        previousStatus: result.previousStatus,
      },
    },
  );

  return result;
}

export async function resubmitTutorVerification(tutorId: string) {
  const db = getFirestore(getAdminApp());
  return applyTutorVerificationResubmit({ db, FieldValue }, { tutorId });
}

/** @deprecated Prefer reviewTutorVerification(..., "approve"). */
export async function verifyTutorProfile(tutorId: string, adminUid: string): Promise<void> {
  await reviewTutorVerification(tutorId, adminUid, "approve");
}
