import { auth, requireFirebaseApp } from "@/lib/firebase/client";
import type { JetSendSendingDomain } from "@/lib/jetsend/sending-domains";

async function readJsonError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? "Não foi possível consultar o JetSend.";
}

async function authorizedFetch(input: string, init?: RequestInit): Promise<Response> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para continuar.");
  }

  const idToken = await user.getIdToken();
  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${idToken}`,
    },
  });
}

export async function fetchJetSendSendingDomains(): Promise<JetSendSendingDomain[]> {
  const response = await authorizedFetch("/api/admin/jetsend/sending-domains");
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; domains?: JetSendSendingDomain[] }
    | null;

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  return payload?.domains ?? [];
}

export async function createJetSendSendingDomain(domain: string): Promise<JetSendSendingDomain> {
  const response = await authorizedFetch("/api/admin/jetsend/sending-domains", {
    method: "POST",
    body: JSON.stringify({ domain }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; domain?: JetSendSendingDomain }
    | null;

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  if (!payload?.domain) {
    throw new Error("Resposta inválida do JetSend.");
  }

  return payload.domain;
}
