import { auth, requireFirebaseApp } from "@/lib/firebase/client";
import type { AdminReviewAction, VerificationStatus } from "@/lib/tutors/verification";

async function postTutorVerification(
  path: string,
  body: Record<string, string>,
): Promise<{ status: VerificationStatus }> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para continuar.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; status?: VerificationStatus }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível atualizar a verificação.");
  }

  return { status: payload?.status ?? "pending" };
}

export async function reviewTutorVerificationRequest(
  tutorId: string,
  action: AdminReviewAction,
  reason?: string,
): Promise<{ status: VerificationStatus }> {
  return postTutorVerification("/api/tutors/review", {
    tutorId,
    action,
    ...(reason ? { reason } : {}),
  });
}

export async function resubmitTutorVerificationRequest(): Promise<{
  status: VerificationStatus;
}> {
  return postTutorVerification("/api/tutors/resubmit", {});
}
