import { auth, requireFirebaseApp } from "@/lib/firebase/client";
import type { AdminOperationsDashboard } from "@/lib/admin/dashboard";

export async function fetchAdminOperationsDashboard(): Promise<AdminOperationsDashboard> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para continuar.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/admin/dashboard", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; dashboard?: AdminOperationsDashboard }
    | null;

  if (!response.ok || !payload?.dashboard) {
    throw new Error(payload?.error || "Não foi possível carregar o painel.");
  }

  return payload.dashboard;
}
