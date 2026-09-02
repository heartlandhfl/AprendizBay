import { auth } from "@/lib/firebase/client";

async function getAdminIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login como administrador.");
  }
  return user.getIdToken();
}

export async function fetchPendingFacilitatorPayouts() {
  const response = await fetch("/api/admin/facilitator-payouts?status=approved", {
    headers: {
      Authorization: `Bearer ${await getAdminIdToken()}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as {
    payouts?: unknown[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Não foi possível carregar os repasses.");
  }
  return payload?.payouts ?? [];
}

export async function fetchAvailableFacilitatorCommissions() {
  const response = await fetch("/api/admin/facilitator-payouts/available", {
    headers: {
      Authorization: `Bearer ${await getAdminIdToken()}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as {
    summaries?: unknown[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Não foi possível carregar as comissões disponíveis.");
  }
  return payload?.summaries ?? [];
}

export async function approveFacilitatorPayout(facilitatorId: string) {
  const response = await fetch("/api/admin/facilitator-payouts/approve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getAdminIdToken()}`,
    },
    body: JSON.stringify({ facilitatorId }),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Não foi possível aprovar o repasse.");
  }
}

export async function markFacilitatorPayoutAsPaid(payoutId: string) {
  const response = await fetch("/api/admin/facilitator-payouts/mark-paid", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getAdminIdToken()}`,
    },
    body: JSON.stringify({ payoutId }),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Não foi possível marcar o repasse como pago.");
  }
}
