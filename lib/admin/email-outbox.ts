import type { Firestore, Query } from "firebase-admin/firestore";
import { EMAIL_EVENTS, type EmailEventName } from "@/lib/email/events";
import { EMAIL_OUTBOX_COLLECTION } from "@/lib/email/outbox/types";
import type { EmailDeliveryStatus, EmailOutboxStatus } from "@/lib/email/outbox/types";
import { availableMetric, serializeTimestamp, unavailableMetric } from "@/lib/admin/metrics";
import type { AdminMetric } from "@/lib/admin/metrics";

const DEFAULT_LIST_LIMIT = 50;
const MAX_FETCH_FOR_FILTER = 250;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

const REPEATED_FAILURE_THRESHOLD = 5;
const BOUNCE_RATE_THRESHOLD = 0.05;
const BACKLOG_THRESHOLD = 20;

export const EMAIL_EVENT_OPTIONS = Object.values(EMAIL_EVENTS) as EmailEventName[];

export const OUTBOX_STATUS_OPTIONS: EmailOutboxStatus[] = [
  "pending",
  "processing",
  "sent",
  "failed",
  "permanent_failure",
];

export const DELIVERY_STATUS_OPTIONS: EmailDeliveryStatus[] = [
  "delivered",
  "bounced",
  "complained",
  "failed",
];

export interface AdminEmailOutboxFilters {
  dateFrom?: string;
  dateTo?: string;
  eventName?: string;
  recipient?: string;
  bookingId?: string;
  provider?: string;
  status?: EmailOutboxStatus;
  deliveryStatus?: EmailDeliveryStatus;
  limit?: number;
}

export interface AdminEmailOutboxListItem {
  emailId: string;
  eventName: string;
  recipientEmail: string;
  recipientUserId?: string;
  bookingId?: string;
  subject: string;
  status: EmailOutboxStatus;
  deliveryStatus?: EmailDeliveryStatus;
  provider?: string;
  providerMessageId?: string;
  attempts: number;
  lastError?: string;
  createdAt: string | null;
  sentAt: string | null;
}

export interface AdminEmailDeliveryAlert {
  id: string;
  severity: "warning" | "critical";
  title: string;
  description: string;
}

export interface AdminEmailDeliveryMonitor {
  generatedAt: string;
  summary: {
    totalSent: AdminMetric;
    pending: AdminMetric;
    processing: AdminMetric;
    delivered: AdminMetric;
    failed: AdminMetric;
    bounced: AdminMetric;
    complained: AdminMetric;
    permanentlyFailed: AdminMetric;
  };
  alerts: AdminEmailDeliveryAlert[];
  emails: AdminEmailOutboxListItem[];
  filters: AdminEmailOutboxFilters;
  truncated: boolean;
}

function parseDateBoundary(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

function maskEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 1) {
    return "***";
  }

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

function serializeOutboxListItem(
  emailId: string,
  data: Record<string, unknown>,
): AdminEmailOutboxListItem {
  const recipientEmail = typeof data.recipientEmail === "string" ? data.recipientEmail : "";

  return {
    emailId,
    eventName: typeof data.eventName === "string" ? data.eventName : "",
    recipientEmail: maskEmail(recipientEmail),
    recipientUserId:
      typeof data.recipientUserId === "string" ? data.recipientUserId : undefined,
    bookingId: typeof data.bookingId === "string" ? data.bookingId : undefined,
    subject: typeof data.subject === "string" ? data.subject : "",
    status: (data.status as EmailOutboxStatus) ?? "pending",
    deliveryStatus:
      typeof data.deliveryStatus === "string"
        ? (data.deliveryStatus as EmailDeliveryStatus)
        : undefined,
    provider: typeof data.provider === "string" ? data.provider : undefined,
    providerMessageId:
      typeof data.providerMessageId === "string" ? data.providerMessageId : undefined,
    attempts: typeof data.attempts === "number" ? data.attempts : 0,
    lastError: typeof data.lastError === "string" ? data.lastError : undefined,
    createdAt: serializeTimestamp(data.createdAt),
    sentAt: serializeTimestamp(data.sentAt),
  };
}

async function countWhere(
  db: Firestore,
  field: string,
  value: string,
): Promise<AdminMetric> {
  try {
    const snapshot = await db
      .collection(EMAIL_OUTBOX_COLLECTION)
      .where(field, "==", value)
      .count()
      .get();
    return availableMetric(snapshot.data().count);
  } catch {
    return unavailableMetric();
  }
}

function matchesFilters(
  data: Record<string, unknown>,
  emailId: string,
  filters: AdminEmailOutboxFilters,
): boolean {
  const dateFrom = parseDateBoundary(filters.dateFrom, false);
  const dateTo = parseDateBoundary(filters.dateTo, true);
  const createdAtRaw = serializeTimestamp(data.createdAt);
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : null;

  if (dateFrom && (!createdAt || createdAt < dateFrom)) {
    return false;
  }
  if (dateTo && (!createdAt || createdAt > dateTo)) {
    return false;
  }

  if (filters.eventName && data.eventName !== filters.eventName) {
    return false;
  }

  if (filters.status && data.status !== filters.status) {
    return false;
  }

  if (filters.deliveryStatus && data.deliveryStatus !== filters.deliveryStatus) {
    return false;
  }

  if (filters.provider && data.provider !== filters.provider) {
    return false;
  }

  if (filters.bookingId && data.bookingId !== filters.bookingId.trim()) {
    return false;
  }

  if (filters.recipient) {
    const needle = filters.recipient.trim().toLowerCase();
    const email =
      typeof data.recipientEmail === "string" ? data.recipientEmail.toLowerCase() : "";
    const userId =
      typeof data.recipientUserId === "string" ? data.recipientUserId.toLowerCase() : "";
    if (!email.includes(needle) && !userId.includes(needle) && !emailId.toLowerCase().includes(needle)) {
      return false;
    }
  }

  return true;
}

function buildAlerts(input: {
  summary: AdminEmailDeliveryMonitor["summary"];
  recentRows: Array<Record<string, unknown>>;
}): AdminEmailDeliveryAlert[] {
  const alerts: AdminEmailDeliveryAlert[] = [];
  const now = Date.now();
  const recentCutoff = now - RECENT_WINDOW_MS;

  const recentJetSendFailures = input.recentRows.filter((row) => {
    const createdAt = serializeTimestamp(row.createdAt);
    const createdMs = createdAt ? new Date(createdAt).getTime() : 0;
    const provider = typeof row.provider === "string" ? row.provider : "";
    const status = typeof row.status === "string" ? row.status : "";
    return (
      createdMs >= recentCutoff &&
      provider === "jetsend" &&
      (status === "failed" || status === "permanent_failure")
    );
  }).length;

  if (recentJetSendFailures >= REPEATED_FAILURE_THRESHOLD) {
    alerts.push({
      id: "repeated-jetsend-failures",
      severity: "critical",
      title: "Falhas repetidas no JetSend",
      description: `${recentJetSendFailures} envios com falha nas últimas 24 horas.`,
    });
  }

  const sentCount =
    input.summary.totalSent.available && input.summary.totalSent.value > 0
      ? input.summary.totalSent.value
      : 0;
  const bouncedCount =
    input.summary.bounced.available ? input.summary.bounced.value : 0;

  if (sentCount >= 10 && bouncedCount / sentCount >= BOUNCE_RATE_THRESHOLD) {
    alerts.push({
      id: "unusual-bounce-rate",
      severity: "warning",
      title: "Taxa de bounce elevada",
      description: `${bouncedCount} bounces em ${sentCount} envios (${Math.round(
        (bouncedCount / sentCount) * 100,
      )}%).`,
    });
  }

  const complainedCount =
    input.summary.complained.available ? input.summary.complained.value : 0;
  if (complainedCount > 0) {
    alerts.push({
      id: "complaint-events",
      severity: "critical",
      title: "Reclamações de spam registradas",
      description: `${complainedCount} e-mail(s) com reclamação (complaint).`,
    });
  }

  const pendingCount =
    input.summary.pending.available ? input.summary.pending.value : 0;
  const processingCount =
    input.summary.processing.available ? input.summary.processing.value : 0;
  const backlog = pendingCount + processingCount;

  if (backlog >= BACKLOG_THRESHOLD) {
    alerts.push({
      id: "growing-outbox-backlog",
      severity: "warning",
      title: "Fila do outbox em crescimento",
      description: `${backlog} e-mails pendentes ou em processamento.`,
    });
  }

  return alerts;
}

async function fetchRecentOutboxRows(db: Firestore, limit: number): Promise<
  Array<{ id: string; data: Record<string, unknown> }>
> {
  let query: Query = db.collection(EMAIL_OUTBOX_COLLECTION);
  if (typeof query.orderBy === "function") {
    query = query.orderBy("createdAt", "desc");
  }
  if (typeof query.limit === "function") {
    query = query.limit(limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    data: (docSnap.data() ?? {}) as Record<string, unknown>,
  }));
}

export function parseAdminEmailOutboxFilters(
  searchParams: URLSearchParams,
): AdminEmailOutboxFilters {
  const limitRaw = Number(searchParams.get("limit"));
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, DEFAULT_LIST_LIMIT)
      : DEFAULT_LIST_LIMIT;

  const status = searchParams.get("status");
  const deliveryStatus = searchParams.get("deliveryStatus");

  return {
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    eventName: searchParams.get("event") ?? undefined,
    recipient: searchParams.get("recipient") ?? undefined,
    bookingId: searchParams.get("booking") ?? undefined,
    provider: searchParams.get("provider") ?? undefined,
    status: OUTBOX_STATUS_OPTIONS.includes(status as EmailOutboxStatus)
      ? (status as EmailOutboxStatus)
      : undefined,
    deliveryStatus: DELIVERY_STATUS_OPTIONS.includes(deliveryStatus as EmailDeliveryStatus)
      ? (deliveryStatus as EmailDeliveryStatus)
      : undefined,
    limit,
  };
}

export async function buildAdminEmailDeliveryMonitor(
  db: Firestore,
  filters: AdminEmailOutboxFilters = {},
): Promise<AdminEmailDeliveryMonitor> {
  const listLimit = filters.limit ?? DEFAULT_LIST_LIMIT;

  const [
    totalSent,
    pending,
    processing,
    delivered,
    failed,
    bounced,
    complained,
    permanentlyFailed,
    recentRows,
  ] = await Promise.all([
    countWhere(db, "status", "sent"),
    countWhere(db, "status", "pending"),
    countWhere(db, "status", "processing"),
    countWhere(db, "deliveryStatus", "delivered"),
    countWhere(db, "status", "failed"),
    countWhere(db, "deliveryStatus", "bounced"),
    countWhere(db, "deliveryStatus", "complained"),
    countWhere(db, "status", "permanent_failure"),
    fetchRecentOutboxRows(db, MAX_FETCH_FOR_FILTER),
  ]);

  const summary = {
    totalSent,
    pending,
    processing,
    delivered,
    failed,
    bounced,
    complained,
    permanentlyFailed,
  };

  const filtered = recentRows
    .filter((row) => matchesFilters(row.data, row.id, filters))
    .slice(0, listLimit)
    .map((row) => serializeOutboxListItem(row.id, row.data));

  const alerts = buildAlerts({
    summary,
    recentRows: recentRows.map((row) => row.data),
  });

  return {
    generatedAt: new Date().toISOString(),
    summary,
    alerts,
    emails: filtered,
    filters,
    truncated: recentRows.length >= MAX_FETCH_FOR_FILTER,
  };
}
