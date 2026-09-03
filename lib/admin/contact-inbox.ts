import type { Firestore, Query } from "firebase-admin/firestore";

import {
  CONTACT_EMAIL_DELIVERY_OPTIONS,
  CONTACT_INBOX_COLLECTION,
  CONTACT_INBOX_STATUS_OPTIONS,
  type ContactEmailDelivery,
  type ContactInboxStatus,
} from "@/lib/contact/types";
import { availableMetric, serializeTimestamp, unavailableMetric } from "@/lib/admin/metrics";
import type { AdminMetric } from "@/lib/admin/metrics";

export {
  CONTACT_EMAIL_DELIVERY_OPTIONS,
  CONTACT_INBOX_STATUS_OPTIONS,
} from "@/lib/contact/types";

const DEFAULT_LIST_LIMIT = 50;
const MAX_FETCH_FOR_FILTER = 250;

export interface AdminContactInboxFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: ContactInboxStatus;
  emailDelivery?: ContactEmailDelivery;
  search?: string;
  limit?: number;
}

export interface AdminContactInboxListItem {
  messageId: string;
  name: string;
  email: string;
  messagePreview: string;
  emailDelivery: ContactEmailDelivery;
  emailSkipReason?: string;
  status: ContactInboxStatus;
  assignedTo?: string;
  createdAt: string | null;
  readAt: string | null;
  respondedAt: string | null;
}

export interface AdminContactInboxDetail extends AdminContactInboxListItem {
  message: string;
}

export interface AdminContactInboxSummary {
  total: AdminMetric;
  unread: AdminMetric;
  read: AdminMetric;
  replied: AdminMetric;
  archived: AdminMetric;
  deliveryFailed: AdminMetric;
  deliverySkipped: AdminMetric;
}

export interface AdminContactInboxList {
  generatedAt: string;
  summary: AdminContactInboxSummary;
  messages: AdminContactInboxListItem[];
  filters: AdminContactInboxFilters;
  truncated: boolean;
}

export interface AdminContactInboxUpdateInput {
  status?: ContactInboxStatus;
  assignedTo?: string | null;
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

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readStatus(value: unknown): ContactInboxStatus {
  if (
    value === "unread" ||
    value === "read" ||
    value === "replied" ||
    value === "archived"
  ) {
    return value;
  }

  return "unread";
}

function readEmailDelivery(value: unknown): ContactEmailDelivery {
  if (value === "sent" || value === "failed" || value === "skipped") {
    return value;
  }

  return "skipped";
}

function buildMessagePreview(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= 160) {
    return trimmed;
  }

  return `${trimmed.slice(0, 157)}...`;
}

function serializeListItem(
  messageId: string,
  data: Record<string, unknown>,
): AdminContactInboxListItem {
  const message = readString(data.message);

  return {
    messageId,
    name: readString(data.name),
    email: readString(data.email),
    messagePreview: buildMessagePreview(message),
    emailDelivery: readEmailDelivery(data.emailDelivery),
    emailSkipReason: readOptionalString(data.emailSkipReason),
    status: readStatus(data.status),
    assignedTo: readOptionalString(data.assignedTo),
    createdAt: serializeTimestamp(data.createdAt),
    readAt: serializeTimestamp(data.readAt),
    respondedAt: serializeTimestamp(data.respondedAt),
  };
}

async function countWhere(
  db: Firestore,
  field: string,
  value: string,
): Promise<AdminMetric> {
  try {
    const snapshot = await db
      .collection(CONTACT_INBOX_COLLECTION)
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
  messageId: string,
  filters: AdminContactInboxFilters,
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

  if (filters.status && readStatus(data.status) !== filters.status) {
    return false;
  }

  if (filters.emailDelivery && readEmailDelivery(data.emailDelivery) !== filters.emailDelivery) {
    return false;
  }

  if (filters.search) {
    const needle = filters.search.trim().toLowerCase();
    const haystack = [
      readString(data.name),
      readString(data.email),
      readString(data.message),
      messageId,
    ]
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(needle)) {
      return false;
    }
  }

  return true;
}

async function fetchRecentContactRows(
  db: Firestore,
  limit: number,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  let query: Query = db.collection(CONTACT_INBOX_COLLECTION);
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

export function parseAdminContactInboxFilters(
  searchParams: URLSearchParams,
): AdminContactInboxFilters {
  const limitRaw = Number(searchParams.get("limit"));
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, DEFAULT_LIST_LIMIT)
      : DEFAULT_LIST_LIMIT;

  const status = searchParams.get("status");
  const emailDelivery = searchParams.get("emailDelivery");

  return {
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    status: CONTACT_INBOX_STATUS_OPTIONS.includes(status as ContactInboxStatus)
      ? (status as ContactInboxStatus)
      : undefined,
    emailDelivery: CONTACT_EMAIL_DELIVERY_OPTIONS.includes(emailDelivery as ContactEmailDelivery)
      ? (emailDelivery as ContactEmailDelivery)
      : undefined,
    limit,
  };
}

export async function buildAdminContactInboxList(
  db: Firestore,
  filters: AdminContactInboxFilters = {},
): Promise<AdminContactInboxList> {
  const listLimit = filters.limit ?? DEFAULT_LIST_LIMIT;

  const [unread, read, replied, archived, deliveryFailed, deliverySkipped, recentRows] =
    await Promise.all([
      countWhere(db, "status", "unread"),
      countWhere(db, "status", "read"),
      countWhere(db, "status", "replied"),
      countWhere(db, "status", "archived"),
      countWhere(db, "emailDelivery", "failed"),
      countWhere(db, "emailDelivery", "skipped"),
      fetchRecentContactRows(db, MAX_FETCH_FOR_FILTER),
    ]);

  const total = availableMetric(
    [unread, read, replied, archived].reduce((sum, metric) => {
      if (!metric.available) {
        return sum;
      }
      return sum + metric.value;
    }, 0),
  );

  const messages = recentRows
    .filter((row) => matchesFilters(row.data, row.id, filters))
    .slice(0, listLimit)
    .map((row) => serializeListItem(row.id, row.data));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total,
      unread,
      read,
      replied,
      archived,
      deliveryFailed,
      deliverySkipped,
    },
    messages,
    filters,
    truncated: recentRows.length >= MAX_FETCH_FOR_FILTER,
  };
}

export async function getAdminContactInboxMessage(
  db: Firestore,
  messageId: string,
): Promise<AdminContactInboxDetail | null> {
  const snapshot = await db.collection(CONTACT_INBOX_COLLECTION).doc(messageId).get();
  if (!snapshot.exists) {
    return null;
  }

  const data = (snapshot.data() ?? {}) as Record<string, unknown>;
  const listItem = serializeListItem(snapshot.id, data);

  return {
    ...listItem,
    message: readString(data.message),
  };
}

export async function updateAdminContactInboxMessage(
  db: Firestore,
  messageId: string,
  input: AdminContactInboxUpdateInput,
): Promise<AdminContactInboxDetail | null> {
  const { FieldValue } = await import("firebase-admin/firestore");
  const docRef = db.collection(CONTACT_INBOX_COLLECTION).doc(messageId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const current = (snapshot.data() ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if (input.status) {
    update.status = input.status;

    if (input.status === "read" && !serializeTimestamp(current.readAt)) {
      update.readAt = FieldValue.serverTimestamp();
    }

    if (input.status === "replied" && !serializeTimestamp(current.respondedAt)) {
      update.respondedAt = FieldValue.serverTimestamp();
    }
  }

  if (input.assignedTo !== undefined) {
    update.assignedTo = input.assignedTo;
  }

  if (Object.keys(update).length === 0) {
    return getAdminContactInboxMessage(db, messageId);
  }

  await docRef.update(update);
  return getAdminContactInboxMessage(db, messageId);
}
