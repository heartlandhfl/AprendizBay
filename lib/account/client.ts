import { auth, requireFirebaseApp } from "@/lib/firebase/client";

/**
 * Hostinger production has no Next.js Server Actions. Call the Express route
 * POST /api/account/delete (server/api/account.js). The same path is served by
 * app/api/account/delete on Vercel / next start.
 */
export async function deleteCurrentAccount(): Promise<void> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para excluir a conta.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/account/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível excluir a conta.");
  }
}
