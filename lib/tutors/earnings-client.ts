import { auth } from "@/lib/firebase/client";
import type { TutorEarningsSummary } from "@/lib/tutors/earnings";
import { emptyTutorEarningsSummary } from "@/lib/tutors/earnings";

export async function fetchOwnTutorEarnings(): Promise<TutorEarningsSummary> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login como professor para ver seus ganhos.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/tutors/me/earnings", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    earnings?: TutorEarningsSummary;
  } | null;

  if (!response.ok || !payload?.earnings) {
    throw new Error(payload?.error ?? "Não foi possível carregar seus ganhos.");
  }

  return {
    ...emptyTutorEarningsSummary(),
    ...payload.earnings,
  };
}
