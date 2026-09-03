import { auth, requireFirebaseApp } from "@/lib/firebase/client";
import type {
  AdminEmailDeliveryMonitor,
  AdminEmailOutboxFilters,
} from "@/lib/admin/email-outbox";

function buildQuery(filters: AdminEmailOutboxFilters): string {
  const params = new URLSearchParams();

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }
  if (filters.eventName) {
    params.set("event", filters.eventName);
  }
  if (filters.recipient) {
    params.set("recipient", filters.recipient);
  }
  if (filters.bookingId) {
    params.set("booking", filters.bookingId);
  }
  if (filters.provider) {
    params.set("provider", filters.provider);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.deliveryStatus) {
    params.set("deliveryStatus", filters.deliveryStatus);
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchAdminEmailDeliveryMonitor(
  filters: AdminEmailOutboxFilters = {},
): Promise<AdminEmailDeliveryMonitor> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para continuar.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch(`/api/admin/email-outbox${buildQuery(filters)}`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; monitor?: AdminEmailDeliveryMonitor; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível carregar o monitor de e-mails.");
  }

  if (!payload?.monitor) {
    throw new Error("Resposta inválida do monitor de e-mails.");
  }

  return payload.monitor;
}
