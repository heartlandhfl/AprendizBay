import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import { mapBookingRecord, type BookingRecord } from "@/lib/bookings/server";
import { generateMeetingUrl } from "@/lib/bookings/meeting";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  maybeCreateFacilitatorCommission,
  reverseFacilitatorCommissionForBooking,
} from "@/lib/facilitators/commission";
import {
  notifyConfirmedBooking,
  notifyPaymentFailed,
  notifyRefundCompleted,
  safeNotify,
} from "@/lib/notifications/server";
import type { PaymentProvider, PaymentStatus } from "@/lib/payments/gateway/types";
import { comparePaidAmountToExpected } from "@/lib/payments/money";
import {
  PAYMENTS_COLLECTION,
  paymentRecordDocId,
  type PaymentRecord,
} from "@/lib/payments/payment-records";
import {
  buildPaymentWebhookEventId,
  PAYMENT_WEBHOOK_RECEIPTS_COLLECTION,
  type PaymentWebhookReceipt,
  type PaymentWebhookReceiptOutcome,
} from "@/lib/payments/payment-webhook-receipts";
import { getSiteOrigin } from "@/lib/seo/site-url";
import {
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_AMOUNT_MISMATCH_MESSAGE,
  WEBHOOK_BOOKING_NOT_FOUND_MESSAGE,
  WEBHOOK_CANCELLED_MESSAGE,
  WEBHOOK_CONFIRMED_MESSAGE,
  WEBHOOK_FAILED_MESSAGE,
} from "@/lib/payments/webhook-receipts";

export type ProcessPaymentWebhookKind =
  | "paid"
  | "already_processed"
  | "cancelled"
  | "booking_not_found"
  | "failed"
  | "refunded"
  | "pending"
  | "ignored"
  | "amount_mismatch";

export interface ProcessPaymentWebhookResult {
  kind: ProcessPaymentWebhookKind;
  httpStatus: 200;
  message: string;
  received: true;
  confirmed?: boolean;
  alreadyProcessed?: boolean;
  ignored?: "cancelled" | "booking_not_found";
  amountMismatch?: boolean;
}

export interface VerifiedPaymentWebhookEvent {
  provider: PaymentProvider;
  eventId: string;
  paymentId: string;
  status: PaymentStatus;
  bookingId?: string;
  amount?: number;
  checkoutId?: string;
}

export interface PaymentWebhookTransaction {
  getBooking(bookingId: string): Promise<BookingRecord | null>;
  getReceipt(eventId: string): Promise<PaymentWebhookReceipt | null>;
  setReceipt(eventId: string, receipt: PaymentWebhookReceipt): void;
  setPaymentRecord(recordId: string, record: PaymentRecord): void;
  updateBooking(bookingId: string, updates: Record<string, unknown>): void;
}

export interface PaymentWebhookStore {
  runAtomic<T>(work: (tx: PaymentWebhookTransaction) => Promise<T>): Promise<T>;
}

export interface ProcessPaymentWebhookDeps {
  store?: PaymentWebhookStore;
  onPaid?: (booking: BookingRecord) => Promise<void>;
  onFailed?: (booking: BookingRecord) => Promise<void>;
  onRefunded?: (booking: BookingRecord) => Promise<void>;
}

function jsonResponseFields(
  kind: ProcessPaymentWebhookKind,
  message: string,
): ProcessPaymentWebhookResult {
  if (kind === "paid") {
    return { kind, httpStatus: 200, received: true, confirmed: true, message };
  }
  if (kind === "already_processed") {
    return { kind, httpStatus: 200, received: true, alreadyProcessed: true, message };
  }
  if (kind === "cancelled") {
    return { kind, httpStatus: 200, received: true, ignored: "cancelled", message };
  }
  if (kind === "amount_mismatch") {
    return { kind, httpStatus: 200, received: true, amountMismatch: true, message };
  }
  if (kind === "booking_not_found") {
    return { kind, httpStatus: 200, received: true, ignored: "booking_not_found", message };
  }
  return { kind, httpStatus: 200, received: true, message };
}

function toPublicResult(kind: ProcessPaymentWebhookKind): ProcessPaymentWebhookResult {
  switch (kind) {
    case "paid":
      return jsonResponseFields(kind, WEBHOOK_CONFIRMED_MESSAGE);
    case "already_processed":
      return jsonResponseFields(kind, WEBHOOK_ALREADY_PROCESSED_MESSAGE);
    case "cancelled":
      return jsonResponseFields(kind, WEBHOOK_CANCELLED_MESSAGE);
    case "failed":
      return jsonResponseFields(kind, WEBHOOK_FAILED_MESSAGE);
    case "amount_mismatch":
      return jsonResponseFields(kind, WEBHOOK_AMOUNT_MISMATCH_MESSAGE);
    case "booking_not_found":
      return jsonResponseFields(kind, WEBHOOK_BOOKING_NOT_FOUND_MESSAGE);
    default:
      return jsonResponseFields(kind, "Evento ignorado.");
  }
}

function bookingAlreadyPaid(booking: BookingRecord): boolean {
  return (
    booking.paymentStatus === "paid" ||
    booking.status === "confirmed" ||
    booking.status === "completed"
  );
}

function buildReceipt(
  event: VerifiedPaymentWebhookEvent,
  outcome: PaymentWebhookReceiptOutcome,
  extras: Partial<PaymentWebhookReceipt> = {},
): PaymentWebhookReceipt {
  return {
    eventId: event.eventId,
    provider: event.provider,
    paymentId: event.paymentId,
    ...(event.bookingId ? { bookingId: event.bookingId } : {}),
    status: event.status,
    outcome,
    ...extras,
  };
}

function buildPaymentRecord(event: VerifiedPaymentWebhookEvent): PaymentRecord {
  return {
    bookingId: event.bookingId ?? "",
    provider: event.provider,
    paymentId: event.paymentId,
    ...(event.checkoutId ? { checkoutId: event.checkoutId } : {}),
    status: event.status,
    ...(typeof event.amount === "number" ? { amount: event.amount } : {}),
  };
}

interface ClaimResult {
  kind: ProcessPaymentWebhookKind;
  booking?: BookingRecord;
}

async function claimPaidPayment(
  tx: PaymentWebhookTransaction,
  event: VerifiedPaymentWebhookEvent,
): Promise<ClaimResult> {
  const existing = await tx.getReceipt(event.eventId);
  if (existing) {
    return { kind: "already_processed" };
  }

  const bookingId = event.bookingId?.trim();
  if (!bookingId) {
    tx.setReceipt(event.eventId, buildReceipt(event, "booking_not_found"));
    return { kind: "booking_not_found" };
  }

  const booking = await tx.getBooking(bookingId);
  if (!booking) {
    tx.setReceipt(event.eventId, buildReceipt(event, "booking_not_found", { bookingId }));
    return { kind: "booking_not_found" };
  }

  if (booking.status === "cancelled") {
    tx.setReceipt(event.eventId, buildReceipt(event, "cancelled", { bookingId }));
    return { kind: "cancelled", booking };
  }

  if (booking.paymentId && booking.paymentId !== event.paymentId) {
    tx.setReceipt(
      event.eventId,
      buildReceipt(event, "amount_mismatch", {
        bookingId,
        mismatchReason: "booking_mismatch",
      }),
    );
    tx.updateBooking(booking.id, {
      paymentAmountMismatch: true,
      paymentMismatchReason: "booking_mismatch",
    });
    return { kind: "amount_mismatch", booking };
  }

  if (bookingAlreadyPaid(booking)) {
    tx.setReceipt(event.eventId, buildReceipt(event, "already_processed", { bookingId }));
    return { kind: "already_processed", booking };
  }

  const amount = comparePaidAmountToExpected(event.amount, booking.price);
  if (!amount.ok) {
    tx.setReceipt(
      event.eventId,
      buildReceipt(event, "amount_mismatch", {
        bookingId,
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
    paymentId: event.paymentId,
    mercadopagoPaymentStatus: event.status === "paid" ? "approved" : undefined,
    meetingUrl,
  });
  tx.setPaymentRecord(paymentRecordDocId(event.provider, event.paymentId), {
    ...buildPaymentRecord(event),
    bookingId,
    status: "paid",
  });
  tx.setReceipt(event.eventId, buildReceipt(event, "paid", { bookingId }));

  return {
    kind: "paid",
    booking: {
      ...booking,
      status: "confirmed",
      paymentStatus: "paid",
      paymentId: event.paymentId,
      meetingUrl,
    },
  };
}

async function claimUnsuccessfulPayment(
  tx: PaymentWebhookTransaction,
  event: VerifiedPaymentWebhookEvent,
): Promise<ClaimResult> {
  const existing = await tx.getReceipt(event.eventId);
  if (existing) {
    return { kind: "already_processed" };
  }

  const bookingId = event.bookingId?.trim();
  if (!bookingId) {
    tx.setReceipt(event.eventId, buildReceipt(event, "booking_not_found"));
    return { kind: "booking_not_found" };
  }

  const booking = await tx.getBooking(bookingId);
  if (!booking) {
    tx.setReceipt(event.eventId, buildReceipt(event, "booking_not_found", { bookingId }));
    return { kind: "booking_not_found" };
  }

  if (booking.status === "cancelled") {
    tx.setReceipt(event.eventId, buildReceipt(event, "cancelled", { bookingId }));
    return { kind: "cancelled", booking };
  }

  if (bookingAlreadyPaid(booking) && event.status !== "refunded") {
    tx.setReceipt(event.eventId, buildReceipt(event, "already_processed", { bookingId }));
    return { kind: "already_processed", booking };
  }

  const paymentStatus =
    event.status === "failed"
      ? "failed"
      : event.status === "expired" || event.status === "cancelled"
        ? "expired"
        : event.status === "refunded"
          ? "paid"
          : "awaiting_payment";

  const updates: Record<string, unknown> = {
    paymentId: event.paymentId,
    mercadopagoPaymentStatus: event.status,
    paymentStatus,
  };

  if (event.status === "refunded") {
    updates.refundStatus = "refunded";
    updates.refundId = event.paymentId;
  }

  tx.updateBooking(booking.id, updates);
  tx.setPaymentRecord(paymentRecordDocId(event.provider, event.paymentId), {
    ...buildPaymentRecord(event),
    bookingId,
    status: event.status,
  });
  tx.setReceipt(
    event.eventId,
    buildReceipt(event, event.status === "refunded" ? "refunded" : event.status === "failed" ? "failed" : "ignored", {
      bookingId,
    }),
  );

  return { kind: event.status === "refunded" ? "refunded" : event.status === "failed" ? "failed" : "ignored", booking };
}

export function createMemoryPaymentWebhookStore(
  bookings: Map<string, BookingRecord> = new Map(),
  receipts: Map<string, PaymentWebhookReceipt> = new Map(),
  payments: Map<string, PaymentRecord> = new Map(),
): PaymentWebhookStore & {
  bookings: Map<string, BookingRecord>;
  receipts: Map<string, PaymentWebhookReceipt>;
  payments: Map<string, PaymentRecord>;
} {
  let queue = Promise.resolve();

  return {
    bookings,
    receipts,
    payments,
    runAtomic<T>(work: (tx: PaymentWebhookTransaction) => Promise<T>): Promise<T> {
      const run = queue.then(async () => {
        const pendingReceipts: Array<[string, PaymentWebhookReceipt]> = [];
        const pendingPayments: Array<[string, PaymentRecord]> = [];
        const pendingBookings: Array<[string, Record<string, unknown>]> = [];

        const tx: PaymentWebhookTransaction = {
          async getBooking(bookingId) {
            return bookings.get(bookingId) ?? null;
          },
          async getReceipt(eventId) {
            return receipts.get(eventId) ?? null;
          },
          setReceipt(eventId, receipt) {
            pendingReceipts.push([eventId, receipt]);
          },
          setPaymentRecord(recordId, record) {
            pendingPayments.push([recordId, record]);
          },
          updateBooking(bookingId, updates) {
            pendingBookings.push([bookingId, updates]);
          },
        };

        const result = await work(tx);

        for (const [id, receipt] of pendingReceipts) {
          receipts.set(id, receipt);
        }
        for (const [id, record] of pendingPayments) {
          payments.set(id, record);
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
              (updates.paymentStatus as BookingRecord["paymentStatus"]) ?? current.paymentStatus,
            meetingUrl:
              typeof updates.meetingUrl === "string" ? updates.meetingUrl : current.meetingUrl,
            paymentId:
              typeof updates.paymentId === "string" ? updates.paymentId : current.paymentId,
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

export function createFirestorePaymentWebhookStore(db: Firestore): PaymentWebhookStore {
  return {
    async runAtomic<T>(work: (tx: PaymentWebhookTransaction) => Promise<T>): Promise<T> {
      return db.runTransaction(async (transaction) => {
        const pendingWrites: Array<() => void> = [];

        const tx: PaymentWebhookTransaction = {
          async getBooking(bookingId) {
            const snap = await transaction.get(db.collection("bookings").doc(bookingId));
            if (!snap.exists) {
              return null;
            }
            return mapBookingRecord(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
          },
          async getReceipt(eventId) {
            const snap = await transaction.get(
              db.collection(PAYMENT_WEBHOOK_RECEIPTS_COLLECTION).doc(eventId),
            );
            if (!snap.exists) {
              return null;
            }
            return snap.data() as PaymentWebhookReceipt;
          },
          setReceipt(eventId, receipt) {
            const ref = db.collection(PAYMENT_WEBHOOK_RECEIPTS_COLLECTION).doc(eventId);
            pendingWrites.push(() =>
              transaction.set(ref, {
                ...receipt,
                createdAt: FieldValue.serverTimestamp(),
              }),
            );
          },
          setPaymentRecord(recordId, record) {
            const ref = db.collection(PAYMENTS_COLLECTION).doc(recordId);
            pendingWrites.push(() =>
              transaction.set(
                ref,
                {
                  ...record,
                  updatedAt: FieldValue.serverTimestamp(),
                  createdAt: FieldValue.serverTimestamp(),
                },
                { merge: true },
              ),
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

function getDefaultStore(): PaymentWebhookStore {
  return createFirestorePaymentWebhookStore(getFirestore(getAdminApp()));
}

async function defaultOnPaid(booking: BookingRecord): Promise<void> {
  await safeNotify(() => notifyConfirmedBooking(booking.id), "confirmed_booking");
  await trackServerEvent({
    name: ANALYTICS_EVENTS.paymentCompleted,
    url: `${getSiteOrigin()}/bookings`,
    props: {
      booking_id: booking.id,
      type: booking.type,
    },
  });

  try {
    const db = getFirestore(getAdminApp());
    await maybeCreateFacilitatorCommission(
      db,
      booking,
      booking.paymentId ?? "",
    );
  } catch (error) {
    console.error("[Aprendiz Bay] Falha ao registrar comissão do facilitador:", error);
  }
}

async function defaultOnFailed(booking: BookingRecord): Promise<void> {
  await safeNotify(() => notifyPaymentFailed(booking.id), "payment_failed");
}

async function defaultOnRefunded(booking: BookingRecord): Promise<void> {
  await safeNotify(
    () => notifyRefundCompleted(booking.id, booking.refundAmount),
    "refund_completed",
  );

  try {
    const db = getFirestore(getAdminApp());
    await reverseFacilitatorCommissionForBooking(db, booking.id);
  } catch (error) {
    console.error("[Aprendiz Bay] Falha ao estornar comissão do facilitador:", error);
  }
}

export function buildVerifiedPaymentWebhookEvent(input: {
  provider: PaymentProvider;
  paymentId: string;
  status: PaymentStatus;
  bookingId?: string;
  amount?: number;
  checkoutId?: string;
}): VerifiedPaymentWebhookEvent {
  return {
    provider: input.provider,
    eventId: buildPaymentWebhookEventId(input.provider, input.paymentId),
    paymentId: input.paymentId,
    status: input.status,
    bookingId: input.bookingId,
    amount: input.amount,
    checkoutId: input.checkoutId,
  };
}

export async function processPaymentWebhook(
  event: VerifiedPaymentWebhookEvent,
  deps: ProcessPaymentWebhookDeps = {},
): Promise<ProcessPaymentWebhookResult> {
  const store = deps.store ?? getDefaultStore();

  if (event.status === "pending" || event.status === "checkout_created") {
    return toPublicResult("pending");
  }

  if (event.status === "paid") {
    const claimed = await store.runAtomic((tx) => claimPaidPayment(tx, event));
    const result = toPublicResult(claimed.kind);
    if (claimed.kind === "paid" && claimed.booking) {
      const onPaid = deps.onPaid ?? defaultOnPaid;
      await onPaid(claimed.booking);
    }
    return result;
  }

  if (event.status === "failed" || event.status === "refunded" || event.status === "cancelled" || event.status === "expired") {
    const claimed = await store.runAtomic((tx) => claimUnsuccessfulPayment(tx, event));
    const result = toPublicResult(claimed.kind);
    if (claimed.kind === "failed" && claimed.booking) {
      const onFailed = deps.onFailed ?? defaultOnFailed;
      await onFailed(claimed.booking);
    }
    if (claimed.kind === "refunded" && claimed.booking) {
      const onRefunded = deps.onRefunded ?? defaultOnRefunded;
      await onRefunded(claimed.booking);
    }
    return result;
  }

  return toPublicResult("ignored");
}
