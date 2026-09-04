import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import { mapBookingRecord, type BookingRecord } from "@/lib/bookings/server";
import { generateMeetingUrl } from "@/lib/bookings/meeting-server";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  notifyConfirmedBooking,
  notifyPaymentFailed,
  notifyRefundCompleted,
  safeNotify,
} from "@/lib/notifications/server";
import type { MercadoPagoPaymentResult } from "@/lib/payments/mercadopago";
import { comparePaidAmountToExpected } from "@/lib/payments/money";
import {
  buildMercadoPagoWebhookReceiptIds,
  MERCADOPAGO_WEBHOOK_RECEIPTS_COLLECTION,
  type MercadoPagoPaymentStatus,
  type MercadoPagoWebhookReceipt,
  type MercadoPagoWebhookReceiptOutcome,
} from "@/lib/payments/mercadopago-webhook-receipts";
import { getSiteOrigin } from "@/lib/seo/site-url";
import {
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_AMOUNT_MISMATCH_MESSAGE,
  WEBHOOK_BOOKING_NOT_FOUND_MESSAGE,
  WEBHOOK_CANCELLED_MESSAGE,
  WEBHOOK_CONFIRMED_MESSAGE,
  WEBHOOK_FAILED_MESSAGE,
} from "@/lib/payments/webhook-receipts";

export type ProcessMercadoPagoWebhookKind =
  | "approved"
  | "already_processed"
  | "cancelled"
  | "booking_not_found"
  | "rejected"
  | "refunded"
  | "pending"
  | "ignored"
  | "amount_mismatch";

export interface ProcessMercadoPagoWebhookResult {
  kind: ProcessMercadoPagoWebhookKind;
  httpStatus: 200;
  message: string;
  received: true;
  confirmed?: boolean;
  alreadyProcessed?: boolean;
  ignored?: "cancelled" | "booking_not_found";
  amountMismatch?: boolean;
}

export interface MercadoPagoWebhookTransaction {
  getBooking(bookingId: string): Promise<BookingRecord | null>;
  getReceipt(receiptId: string): Promise<MercadoPagoWebhookReceipt | null>;
  setReceipt(receiptId: string, receipt: MercadoPagoWebhookReceipt): void;
  updateBooking(bookingId: string, updates: Record<string, unknown>): void;
}

export interface MercadoPagoWebhookStore {
  runAtomic<T>(work: (tx: MercadoPagoWebhookTransaction) => Promise<T>): Promise<T>;
}

export interface ProcessMercadoPagoWebhookDeps {
  store?: MercadoPagoWebhookStore;
  onApproved?: (booking: BookingRecord) => Promise<void>;
  onFailed?: (booking: BookingRecord) => Promise<void>;
  onRefunded?: (booking: BookingRecord) => Promise<void>;
}

export interface VerifiedMercadoPagoWebhookEvent {
  paymentId: string;
  notificationId?: string;
  requestId?: string;
  payment: MercadoPagoPaymentResult;
}

function jsonResponseFields(
  kind: ProcessMercadoPagoWebhookKind,
  message: string,
): ProcessMercadoPagoWebhookResult {
  if (kind === "approved") {
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

  if (kind === "amount_mismatch") {
    return {
      kind,
      httpStatus: 200,
      received: true,
      amountMismatch: true,
      message,
    };
  }

  if (kind === "booking_not_found") {
    return {
      kind,
      httpStatus: 200,
      received: true,
      ignored: "booking_not_found",
      message,
    };
  }

  return {
    kind,
    httpStatus: 200,
    received: true,
    message,
  };
}

function toPublicResult(kind: ProcessMercadoPagoWebhookKind): ProcessMercadoPagoWebhookResult {
  switch (kind) {
    case "approved":
      return jsonResponseFields(kind, WEBHOOK_CONFIRMED_MESSAGE);
    case "already_processed":
      return jsonResponseFields(kind, WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    case "cancelled":
      return jsonResponseFields(kind, WEBHOOK_CANCELLED_MESSAGE);
    case "rejected":
      return jsonResponseFields(kind, WEBHOOK_FAILED_MESSAGE);
    case "amount_mismatch":
      return jsonResponseFields(kind, WEBHOOK_AMOUNT_MISMATCH_MESSAGE);
    case "booking_not_found":
      return jsonResponseFields(kind, WEBHOOK_BOOKING_NOT_FOUND_MESSAGE);
    default:
      return jsonResponseFields(kind, "Evento ignorado.");
  }
}

function buildReceipt(
  event: VerifiedMercadoPagoWebhookEvent,
  outcome: MercadoPagoWebhookReceiptOutcome,
  bookingId?: string,
  extras: Partial<MercadoPagoWebhookReceipt> = {},
): MercadoPagoWebhookReceipt {
  return {
    paymentId: event.paymentId,
    ...(event.notificationId ? { notificationId: event.notificationId } : {}),
    ...(event.requestId ? { requestId: event.requestId } : {}),
    ...(bookingId ? { bookingId } : {}),
    mpStatus: event.payment.status,
    outcome,
    ...extras,
  };
}

function writeReceipts(
  tx: MercadoPagoWebhookTransaction,
  receiptIds: string[],
  receipt: MercadoPagoWebhookReceipt,
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

function verifyPaymentCurrency(payment: MercadoPagoPaymentResult): boolean {
  const currency = payment.currencyId?.trim().toUpperCase();
  return !currency || currency === "BRL";
}

function verifyPaymentBelongsToBooking(
  payment: MercadoPagoPaymentResult,
  booking: BookingRecord,
): boolean {
  const externalReference = payment.externalReference?.trim();
  if (!externalReference || externalReference !== booking.id) {
    return false;
  }
  if (booking.paymentId && booking.paymentId !== payment.id) {
    return false;
  }
  return true;
}

interface ClaimResult {
  kind: ProcessMercadoPagoWebhookKind;
  booking?: BookingRecord;
}

async function claimApprovedPayment(
  tx: MercadoPagoWebhookTransaction,
  event: VerifiedMercadoPagoWebhookEvent,
  receiptIds: string[],
): Promise<ClaimResult> {
  const existing = await Promise.all(receiptIds.map((id) => tx.getReceipt(id)));
  if (existing.some((receipt) => receipt != null)) {
    return { kind: "already_processed" };
  }

  const bookingId = event.payment.externalReference?.trim();
  if (!bookingId) {
    return { kind: "booking_not_found" };
  }

  const booking = await tx.getBooking(bookingId);
  if (!booking) {
    writeReceipts(
      tx,
      receiptIds,
      buildReceipt(event, "booking_not_found", undefined),
    );
    return { kind: "booking_not_found" };
  }

  if (booking.status === "cancelled") {
    writeReceipts(tx, receiptIds, buildReceipt(event, "cancelled", booking.id));
    return { kind: "cancelled", booking };
  }

  if (!verifyPaymentBelongsToBooking(event.payment, booking)) {
    writeReceipts(
      tx,
      receiptIds,
      buildReceipt(event, "amount_mismatch", booking.id, {
        mismatchReason: "booking_mismatch",
      }),
    );
    tx.updateBooking(booking.id, {
      paymentAmountMismatch: true,
      paymentMismatchReason: "booking_mismatch",
    });
    return { kind: "amount_mismatch", booking };
  }

  if (!verifyPaymentCurrency(event.payment)) {
    writeReceipts(
      tx,
      receiptIds,
      buildReceipt(event, "amount_mismatch", booking.id, {
        mismatchReason: "invalid_currency",
      }),
    );
    tx.updateBooking(booking.id, {
      paymentAmountMismatch: true,
      paymentMismatchReason: "invalid_currency",
    });
    return { kind: "amount_mismatch", booking };
  }

  if (bookingAlreadyPaid(booking)) {
    writeReceipts(
      tx,
      receiptIds,
      buildReceipt(event, "already_confirmed", booking.id),
    );
    return { kind: "already_processed", booking };
  }

  const amount = comparePaidAmountToExpected(
    event.payment.transactionAmount,
    booking.price,
  );
  if (!amount.ok) {
    writeReceipts(
      tx,
      receiptIds,
      buildReceipt(event, "amount_mismatch", booking.id, {
        expectedAmountCents: amount.expectedCents ?? undefined,
        paidAmountCents: amount.paidCents,
        mismatchReason: amount.reason,
      }),
    );
    tx.updateBooking(booking.id, {
      paymentAmountMismatch: true,
      paymentMismatchReason: amount.reason,
      paymentMismatchExpectedCents: amount.expectedCents,
      paymentMismatchPaidCents: amount.paidCents,
    });
    return { kind: "amount_mismatch", booking };
  }

  const meetingUrl = booking.meetingUrl || generateMeetingUrl(booking.id);
  tx.updateBooking(booking.id, {
    status: "confirmed",
    paymentStatus: "paid",
    paymentId: event.payment.id,
    mercadopagoPaymentStatus: event.payment.status,
    meetingUrl,
  });
  writeReceipts(tx, receiptIds, buildReceipt(event, "approved", booking.id));

  return {
    kind: "approved",
    booking: {
      ...booking,
      status: "confirmed",
      paymentStatus: "paid",
      paymentId: event.payment.id,
      mercadopagoPaymentStatus: event.payment.status,
      meetingUrl,
    },
  };
}

async function claimUnsuccessfulPayment(
  tx: MercadoPagoWebhookTransaction,
  event: VerifiedMercadoPagoWebhookEvent,
  outcome: "rejected" | "cancelled" | "refunded",
): Promise<ClaimResult> {
  const bookingId = event.payment.externalReference?.trim();
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
    if (outcome === "refunded") {
      tx.updateBooking(booking.id, {
        mercadopagoPaymentStatus: event.payment.status,
        refundStatus: event.payment.status,
        refundId: event.payment.id,
      });
      return { kind: "refunded", booking };
    }
    return { kind: "already_processed", booking };
  }

  if (!verifyPaymentBelongsToBooking(event.payment, booking)) {
    return { kind: "amount_mismatch", booking };
  }

  const paymentStatus =
    outcome === "rejected" ? "failed" : outcome === "cancelled" ? "expired" : "paid";

  const updates: Record<string, unknown> = {
    paymentId: event.payment.id,
    mercadopagoPaymentStatus: event.payment.status,
    paymentStatus,
  };

  if (outcome === "refunded") {
    updates.refundStatus = event.payment.status;
    updates.refundId = event.payment.id;
  }

  tx.updateBooking(booking.id, updates);
  return {
    kind: outcome,
    booking: {
      ...booking,
      paymentStatus: paymentStatus as BookingRecord["paymentStatus"],
      paymentId: event.payment.id,
      mercadopagoPaymentStatus: event.payment.status,
    },
  };
}

export function createMemoryMercadoPagoWebhookStore(
  bookings: Map<string, BookingRecord> = new Map(),
  receipts: Map<string, MercadoPagoWebhookReceipt> = new Map(),
): MercadoPagoWebhookStore & {
  bookings: Map<string, BookingRecord>;
  receipts: Map<string, MercadoPagoWebhookReceipt>;
} {
  let queue = Promise.resolve();

  return {
    bookings,
    receipts,
    runAtomic<T>(work: (tx: MercadoPagoWebhookTransaction) => Promise<T>): Promise<T> {
      const run = queue.then(async () => {
        const pendingReceipts: Array<[string, MercadoPagoWebhookReceipt]> = [];
        const pendingBookings: Array<[string, Record<string, unknown>]> = [];

        const tx: MercadoPagoWebhookTransaction = {
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
            mercadopagoPaymentStatus:
              typeof updates.mercadopagoPaymentStatus === "string"
                ? (updates.mercadopagoPaymentStatus as MercadoPagoPaymentStatus)
                : current.mercadopagoPaymentStatus,
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

export function createFirestoreMercadoPagoWebhookStore(db: Firestore): MercadoPagoWebhookStore {
  return {
    async runAtomic<T>(work: (tx: MercadoPagoWebhookTransaction) => Promise<T>): Promise<T> {
      return db.runTransaction(async (transaction) => {
        const pendingWrites: Array<() => void> = [];

        const tx: MercadoPagoWebhookTransaction = {
          async getBooking(bookingId) {
            const snap = await transaction.get(db.collection("bookings").doc(bookingId));
            if (!snap.exists) {
              return null;
            }
            return mapBookingRecord(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
          },
          async getReceipt(receiptId) {
            const snap = await transaction.get(
              db.collection(MERCADOPAGO_WEBHOOK_RECEIPTS_COLLECTION).doc(receiptId),
            );
            if (!snap.exists) {
              return null;
            }
            return snap.data() as MercadoPagoWebhookReceipt;
          },
          setReceipt(receiptId, receipt) {
            const ref = db.collection(MERCADOPAGO_WEBHOOK_RECEIPTS_COLLECTION).doc(receiptId);
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

function getDefaultStore(): MercadoPagoWebhookStore {
  return createFirestoreMercadoPagoWebhookStore(getFirestore(getAdminApp()));
}

async function defaultOnApproved(booking: BookingRecord): Promise<void> {
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

async function defaultOnFailed(booking: BookingRecord): Promise<void> {
  await safeNotify(() => notifyPaymentFailed(booking.id), "payment_failed");
}

async function defaultOnRefunded(booking: BookingRecord): Promise<void> {
  await safeNotify(
    () => notifyRefundCompleted(booking.id, booking.refundAmount),
    "refund_completed",
  );
}

export async function processMercadoPagoPaymentWebhook(
  event: VerifiedMercadoPagoWebhookEvent,
  deps: ProcessMercadoPagoWebhookDeps = {},
): Promise<ProcessMercadoPagoWebhookResult> {
  const store = deps.store ?? getDefaultStore();
  const status = event.payment.status;

  if (status === "pending" || status === "in_process" || status === "authorized") {
    return toPublicResult("pending");
  }

  if (status === "in_mediation") {
    return toPublicResult("ignored");
  }

  if (status === "rejected") {
    const claimed = await store.runAtomic((tx) =>
      claimUnsuccessfulPayment(tx, event, "rejected"),
    );
    const result = toPublicResult(claimed.kind);
    if (claimed.kind === "rejected" && claimed.booking) {
      const onFailed = deps.onFailed ?? defaultOnFailed;
      await onFailed(claimed.booking);
    }
    return result;
  }

  if (status === "cancelled") {
    const claimed = await store.runAtomic((tx) =>
      claimUnsuccessfulPayment(tx, event, "cancelled"),
    );
    return toPublicResult(claimed.kind);
  }

  if (status === "refunded" || status === "charged_back") {
    const claimed = await store.runAtomic((tx) =>
      claimUnsuccessfulPayment(tx, event, "refunded"),
    );
    const result = toPublicResult(claimed.kind);
    if (claimed.kind === "refunded" && claimed.booking) {
      const onRefunded = deps.onRefunded ?? defaultOnRefunded;
      await onRefunded(claimed.booking);
    }
    return result;
  }

  if (status !== "approved") {
    return toPublicResult("ignored");
  }

  const receiptIds = buildMercadoPagoWebhookReceiptIds({
    paymentId: event.paymentId,
    notificationId: event.notificationId,
    bookingId: event.payment.externalReference,
  });

  const claimed = await store.runAtomic((tx) =>
    claimApprovedPayment(tx, event, receiptIds),
  );
  const result = toPublicResult(claimed.kind);

  if (claimed.kind === "approved" && claimed.booking) {
    const onApproved = deps.onApproved ?? defaultOnApproved;
    await onApproved(claimed.booking);
  }

  return result;
}
