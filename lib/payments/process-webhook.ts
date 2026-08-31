import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import {
  mapBookingRecord,
  type BookingRecord,
} from "@/lib/bookings/server";
import { generateMeetingUrl } from "@/lib/bookings/meeting";
import { getAdminApp } from "@/lib/firebase/admin";
import { notifyConfirmedBooking, safeNotify } from "@/lib/notifications/server";
import type { AsaasWebhookMatch, AsaasWebhookOutcome } from "@/lib/payments/asaas";
import { getSiteOrigin } from "@/lib/seo/site-url";
import {
  ASAAS_WEBHOOK_RECEIPTS_COLLECTION,
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_BOOKING_NOT_FOUND_MESSAGE,
  WEBHOOK_CANCELLED_MESSAGE,
  WEBHOOK_CONFIRMED_MESSAGE,
  WEBHOOK_EXPIRED_MESSAGE,
  WEBHOOK_FAILED_MESSAGE,
  buildAsaasWebhookReceiptIds,
  type AsaasWebhookReceipt,
  type AsaasWebhookReceiptOutcome,
} from "@/lib/payments/webhook-receipts";

export type ProcessAsaasWebhookKind =
  | "confirmed"
  | "already_processed"
  | "cancelled"
  | "booking_not_found"
  | "failed"
  | "expired"
  | "ignored";

export interface ProcessAsaasWebhookResult {
  kind: ProcessAsaasWebhookKind;
  httpStatus: 200;
  message: string;
  received: true;
  confirmed?: boolean;
  alreadyProcessed?: boolean;
  ignored?: "cancelled" | "booking_not_found";
}

export interface WebhookTransaction {
  getBooking(bookingId: string): Promise<BookingRecord | null>;
  getReceipt(receiptId: string): Promise<AsaasWebhookReceipt | null>;
  setReceipt(receiptId: string, receipt: AsaasWebhookReceipt): void;
  updateBooking(bookingId: string, updates: Record<string, unknown>): void;
}

export interface WebhookStore {
  runAtomic<T>(work: (tx: WebhookTransaction) => Promise<T>): Promise<T>;
}

export interface ProcessAsaasWebhookDeps {
  store?: WebhookStore;
  onConfirmed?: (booking: BookingRecord) => Promise<void>;
}

function jsonResponseFields(
  kind: ProcessAsaasWebhookKind,
  message: string,
): ProcessAsaasWebhookResult {
  if (kind === "confirmed") {
    return {
      kind,
      httpStatus: 200,
      received: true,
      confirmed: true,
      message,
    };
  }

  if (kind === "already_processed") {
    return {
      kind,
      httpStatus: 200,
      received: true,
      alreadyProcessed: true,
      message,
    };
  }

  if (kind === "cancelled") {
    return {
      kind,
      httpStatus: 200,
      received: true,
      ignored: "cancelled",
      message,
    };
  }

  if (kind === "failed" || kind === "expired" || kind === "ignored") {
    return {
      kind,
      httpStatus: 200,
      received: true,
      message,
    };
  }

  return {
    kind: "booking_not_found",
    httpStatus: 200,
    received: true,
    ignored: "booking_not_found",
    message,
  };
}

function toPublicResult(kind: ProcessAsaasWebhookKind): ProcessAsaasWebhookResult {
  switch (kind) {
    case "confirmed":
      return jsonResponseFields(kind, WEBHOOK_CONFIRMED_MESSAGE);
    case "already_processed":
      return jsonResponseFields(kind, WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    case "cancelled":
      return jsonResponseFields(kind, WEBHOOK_CANCELLED_MESSAGE);
    case "failed":
      return jsonResponseFields(kind, WEBHOOK_FAILED_MESSAGE);
    case "expired":
      return jsonResponseFields(kind, WEBHOOK_EXPIRED_MESSAGE);
    case "ignored":
      return jsonResponseFields(kind, eventIgnoredMessage());
    default:
      return jsonResponseFields(kind, WEBHOOK_BOOKING_NOT_FOUND_MESSAGE);
  }
}

function eventIgnoredMessage(): string {
  return "Evento ignorado.";
}

function resolveEventOutcome(event: AsaasWebhookMatch): AsaasWebhookOutcome {
  if (event.outcome) {
    return event.outcome;
  }
  return event.isSuccessfulPayment ? "successful" : "ignored";
}

function buildReceipt(
  event: AsaasWebhookMatch,
  outcome: AsaasWebhookReceiptOutcome,
  bookingId?: string,
): AsaasWebhookReceipt {
  return {
    ...(event.paymentId ? { paymentId: event.paymentId } : {}),
    ...(event.asaasCheckoutId ? { asaasCheckoutId: event.asaasCheckoutId } : {}),
    ...(bookingId ? { bookingId } : {}),
    event: event.event || "unknown",
    outcome,
  };
}

function writeReceipts(
  tx: WebhookTransaction,
  receiptIds: string[],
  receipt: AsaasWebhookReceipt,
): void {
  for (const receiptId of receiptIds) {
    tx.setReceipt(receiptId, receipt);
  }
}

function bookingAlreadyPaid(booking: BookingRecord): boolean {
  return (
    booking.paymentStatus === "paid" ||
    booking.status === "confirmed" ||
    booking.status === "completed"
  );
}

interface ClaimResult {
  kind: ProcessAsaasWebhookKind;
  booking?: BookingRecord;
}

async function claimSuccessfulPayment(
  tx: WebhookTransaction,
  event: AsaasWebhookMatch,
  receiptIds: string[],
): Promise<ClaimResult> {
  const existing = await Promise.all(receiptIds.map((id) => tx.getReceipt(id)));
  if (existing.some((receipt) => receipt != null)) {
    return { kind: "already_processed" };
  }

  const bookingId = event.bookingId;
  if (!bookingId) {
    return { kind: "booking_not_found" };
  }

  const booking = await tx.getBooking(bookingId);
  if (!booking) {
    return { kind: "booking_not_found" };
  }

  if (booking.status === "cancelled") {
    writeReceipts(tx, receiptIds, buildReceipt(event, "cancelled", booking.id));
    return { kind: "cancelled", booking };
  }

  if (bookingAlreadyPaid(booking)) {
    writeReceipts(tx, receiptIds, buildReceipt(event, "already_confirmed", booking.id));
    return { kind: "already_processed", booking };
  }

  const meetingUrl = booking.meetingUrl || generateMeetingUrl(booking.id);
  const updates: Record<string, unknown> = {
    status: "confirmed",
    paymentStatus: "paid",
    meetingUrl,
  };

  if (event.paymentId) {
    updates.paymentId = event.paymentId;
  }
  if (event.asaasCheckoutId) {
    updates.asaasCheckoutId = event.asaasCheckoutId;
  }

  tx.updateBooking(booking.id, updates);
  writeReceipts(tx, receiptIds, buildReceipt(event, "confirmed", booking.id));
  return {
    kind: "confirmed",
    booking: {
      ...booking,
      status: "confirmed",
      paymentStatus: "paid",
      meetingUrl,
      paymentId: event.paymentId ?? booking.paymentId,
      asaasCheckoutId: event.asaasCheckoutId ?? booking.asaasCheckoutId,
    },
  };
}

async function claimUnsuccessfulPayment(
  tx: WebhookTransaction,
  event: AsaasWebhookMatch,
  outcome: "failed" | "expired",
): Promise<ClaimResult> {
  const bookingId = event.bookingId;
  if (!bookingId) {
    return { kind: "booking_not_found" };
  }

  const booking = await tx.getBooking(bookingId);
  if (!booking) {
    return { kind: "booking_not_found" };
  }

  if (booking.status === "cancelled") {
    return { kind: "cancelled", booking };
  }

  if (bookingAlreadyPaid(booking)) {
    return { kind: "already_processed", booking };
  }

  const paymentStatus = outcome === "failed" ? "failed" : "expired";
  const updates: Record<string, unknown> = {
    paymentStatus,
  };

  if (event.paymentId) {
    updates.paymentId = event.paymentId;
  }
  if (event.asaasCheckoutId) {
    updates.asaasCheckoutId = event.asaasCheckoutId;
  }
  if (outcome === "expired") {
    updates.asaasCheckoutExpiresAt = new Date();
  }

  tx.updateBooking(booking.id, updates);
  return {
    kind: outcome,
    booking: {
      ...booking,
      paymentStatus,
      paymentId: event.paymentId ?? booking.paymentId,
      asaasCheckoutId: event.asaasCheckoutId ?? booking.asaasCheckoutId,
      ...(outcome === "expired" ? { asaasCheckoutExpiresAt: new Date() } : {}),
    },
  };
}

export function createMemoryWebhookStore(
  bookings: Map<string, BookingRecord> = new Map(),
  receipts: Map<string, AsaasWebhookReceipt> = new Map(),
): WebhookStore & {
  bookings: Map<string, BookingRecord>;
  receipts: Map<string, AsaasWebhookReceipt>;
} {
  let queue = Promise.resolve();

  return {
    bookings,
    receipts,
    runAtomic<T>(work: (tx: WebhookTransaction) => Promise<T>): Promise<T> {
      const run = queue.then(async () => {
        const pendingReceipts: Array<[string, AsaasWebhookReceipt]> = [];
        const pendingBookings: Array<[string, Record<string, unknown>]> = [];

        const tx: WebhookTransaction = {
          async getBooking(bookingId) {
            return bookings.get(bookingId) ?? null;
          },
          async getReceipt(receiptId) {
            return receipts.get(receiptId) ?? null;
          },
          setReceipt(receiptId, receipt) {
            pendingReceipts.push([receiptId, receipt]);
          },
          updateBooking(bookingId, updates) {
            pendingBookings.push([bookingId, updates]);
          },
        };

        const result = await work(tx);

        for (const [id, receipt] of pendingReceipts) {
          receipts.set(id, receipt);
        }
        for (const [id, updates] of pendingBookings) {
          const current = bookings.get(id);
          if (!current) {
            continue;
          }
          bookings.set(id, {
            ...current,
            ...updates,
            status: (updates.status as BookingRecord["status"]) ?? current.status,
            paymentStatus:
              (updates.paymentStatus as BookingRecord["paymentStatus"]) ??
              current.paymentStatus,
            meetingUrl:
              typeof updates.meetingUrl === "string" ? updates.meetingUrl : current.meetingUrl,
            paymentId:
              typeof updates.paymentId === "string" ? updates.paymentId : current.paymentId,
            asaasCheckoutId:
              typeof updates.asaasCheckoutId === "string"
                ? updates.asaasCheckoutId
                : current.asaasCheckoutId,
            asaasCheckoutExpiresAt:
              updates.asaasCheckoutExpiresAt instanceof Date
                ? updates.asaasCheckoutExpiresAt
                : current.asaasCheckoutExpiresAt,
          });
        }

        return result;
      });

      queue = run.then(
        () => undefined,
        () => undefined,
      );

      return run;
    },
  };
}

export function createFirestoreWebhookStore(db: Firestore): WebhookStore {
  return {
    async runAtomic<T>(work: (tx: WebhookTransaction) => Promise<T>): Promise<T> {
      return db.runTransaction(async (transaction) => {
        const pendingWrites: Array<() => void> = [];

        const tx: WebhookTransaction = {
          async getBooking(bookingId) {
            const snap = await transaction.get(db.collection("bookings").doc(bookingId));
            if (!snap.exists) {
              return null;
            }
            return mapBookingRecord(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
          },
          async getReceipt(receiptId) {
            const snap = await transaction.get(
              db.collection(ASAAS_WEBHOOK_RECEIPTS_COLLECTION).doc(receiptId),
            );
            if (!snap.exists) {
              return null;
            }
            return snap.data() as AsaasWebhookReceipt;
          },
          setReceipt(receiptId, receipt) {
            const ref = db.collection(ASAAS_WEBHOOK_RECEIPTS_COLLECTION).doc(receiptId);
            pendingWrites.push(() =>
              transaction.set(ref, {
                ...receipt,
                createdAt: FieldValue.serverTimestamp(),
              }),
            );
          },
          updateBooking(bookingId, updates) {
            const ref = db.collection("bookings").doc(bookingId);
            pendingWrites.push(() =>
              transaction.update(ref, {
                ...updates,
                updatedAt: FieldValue.serverTimestamp(),
              }),
            );
          },
        };

        const result = await work(tx);
        for (const write of pendingWrites) {
          write();
        }
        return result;
      });
    },
  };
}

function getDefaultStore(): WebhookStore {
  return createFirestoreWebhookStore(getFirestore(getAdminApp()));
}

async function defaultOnConfirmed(booking: BookingRecord): Promise<void> {
  await safeNotify(() => notifyConfirmedBooking(booking.id), "confirmed_booking");
  await trackServerEvent({
    name: ANALYTICS_EVENTS.paymentCompleted,
    url: `${getSiteOrigin()}/bookings`,
    props: {
      booking_id: booking.id,
      type: booking.type,
    },
  });
}

export async function processAsaasPaymentWebhook(
  event: AsaasWebhookMatch,
  deps: ProcessAsaasWebhookDeps = {},
): Promise<ProcessAsaasWebhookResult> {
  const store = deps.store ?? getDefaultStore();
  const outcome = resolveEventOutcome(event);

  if (outcome === "ignored") {
    return toPublicResult("ignored");
  }

  if (outcome === "failed" || outcome === "expired") {
    const claimed = await store.runAtomic((tx) =>
      claimUnsuccessfulPayment(tx, event, outcome),
    );
    return toPublicResult(claimed.kind);
  }

  const receiptIds = buildAsaasWebhookReceiptIds(event);
  const claimed = await store.runAtomic((tx) => claimSuccessfulPayment(tx, event, receiptIds));
  const result = toPublicResult(claimed.kind);

  if (claimed.kind === "confirmed" && claimed.booking) {
    const onConfirmed = deps.onConfirmed ?? defaultOnConfirmed;
    await onConfirmed(claimed.booking);
  }

  return result;
}
