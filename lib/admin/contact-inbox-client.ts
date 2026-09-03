import { auth, requireFirebaseApp } from "@/lib/firebase/client";
import type {
  AdminContactInboxDetail,
  AdminContactInboxFilters,
  AdminContactInboxList,
  AdminContactInboxUpdateInput,
} from "@/lib/admin/contact-inbox-shared";

function buildQuery(filters: AdminContactInboxFilters): string {
  const params = new URLSearchParams();

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.emailDelivery) {
    params.set("emailDelivery", filters.emailDelivery);
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function getAuthHeaders(): Promise<HeadersInit> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para continuar.");
  }

  const idToken = await user.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };
}

export async function fetchAdminContactInbox(
  filters: AdminContactInboxFilters = {},
): Promise<AdminContactInboxList> {
  const response = await fetch(`/api/admin/contact-inbox${buildQuery(filters)}`, {
    headers: await getAuthHeaders(),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; inbox?: AdminContactInboxList; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível carregar a caixa de entrada.");
  }

  if (!payload?.inbox) {
    throw new Error("Resposta inválida da caixa de entrada.");
  }

  return payload.inbox;
}

export async function fetchAdminContactInboxMessage(
  messageId: string,
): Promise<AdminContactInboxDetail> {
  const response = await fetch(`/api/admin/contact-inbox/${encodeURIComponent(messageId)}`, {
    headers: await getAuthHeaders(),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; message?: AdminContactInboxDetail; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível carregar a mensagem.");
  }

  if (!payload?.message) {
    throw new Error("Resposta inválida da mensagem.");
  }

  return payload.message;
}

export async function updateAdminContactInboxMessage(
  messageId: string,
  input: AdminContactInboxUpdateInput,
): Promise<AdminContactInboxDetail> {
  const response = await fetch(`/api/admin/contact-inbox/${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; message?: AdminContactInboxDetail; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível atualizar a mensagem.");
  }

  if (!payload?.message) {
    throw new Error("Resposta inválida da atualização.");
  }

  return payload.message;
}
