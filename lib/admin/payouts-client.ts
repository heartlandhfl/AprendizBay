import { auth, requireFirebaseApp } from "@/lib/firebase/client";
import type { AdminTutorPayoutListItem } from "@/lib/admin/tutor-payouts";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para continuar.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${idToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; payouts?: AdminTutorPayoutListItem[]; payout?: AdminTutorPayoutListItem }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível concluir a operação.");
  }

  return payload as T;
}

export async function fetchPendingTutorPayouts(): Promise<AdminTutorPayoutListItem[]> {
  const payload = await adminFetch<{ payouts: AdminTutorPayoutListItem[] }>(
    "/api/admin/tutor-payouts?status=pending",
  );
  return payload.payouts ?? [];
}

export async function markTutorPayoutAsPaid(
  payoutId: string,
): Promise<AdminTutorPayoutListItem> {
  const payload = await adminFetch<{ payout: AdminTutorPayoutListItem }>(
    "/api/admin/tutor-payouts/mark-paid",
    {
      method: "POST",
      body: JSON.stringify({ payoutId }),
    },
  );
  if (!payload.payout) {
    throw new Error("Não foi possível marcar o repasse como pago.");
  }
  return payload.payout;
}
