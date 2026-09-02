import { auth } from "@/lib/firebase/client";

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para continuar.");
  }
  return user.getIdToken();
}

export async function attachReferralAfterSignup(input: {
  referralCode: string;
  userPhone?: string;
  userCpf?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const idToken = await getIdToken();
  const response = await fetch("/api/referrals/attach", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
  if (!response.ok) {
    return { ok: false, reason: payload?.reason ?? "Não foi possível registrar a indicação." };
  }

  return { ok: Boolean(payload?.ok), reason: payload?.reason };
}

export async function fetchFacilitatorDashboard(): Promise<Record<string, unknown>> {
  const idToken = await getIdToken();
  const response = await fetch("/api/facilitators/me/dashboard", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; dashboard?: Record<string, unknown> }
    | null;

  if (!response.ok || !payload?.dashboard) {
    throw new Error(payload?.error ?? "Não foi possível carregar o painel do facilitador.");
  }

  return payload.dashboard;
}
