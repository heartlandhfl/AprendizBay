import type { AdminMetric } from "@/lib/admin/metrics";

export const UNAVAILABLE_LABEL = "Indisponível";

export function formatAdminCount(metric: AdminMetric): string {
  if (!metric.available) {
    return UNAVAILABLE_LABEL;
  }

  return metric.value.toLocaleString("pt-BR");
}

export function formatAdminMoney(metric: AdminMetric): string {
  if (!metric.available) {
    return UNAVAILABLE_LABEL;
  }

  return metric.value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatAdminDate(value: string | null): string {
  if (!value) {
    return UNAVAILABLE_LABEL;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return UNAVAILABLE_LABEL;
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
