import {
  CANCEL_ERRORS,
  CancelBookingError,
  REFUND_CLAIM_MS,
  REFUND_CLAIM_STATUS,
  capRefundAmount,
  decideCancellation,
  hasRecordedRefund,
  isRefundClaimActive,
  rejectionError,
  resolveCancelActor,
} from "@/lib/bookings/cancellation";
import type { BookingRecord } from "@/lib/bookings/server";
import {
  findAsaasPaymentIdByExternalReference,
  refundAsaasPayment,
  resolveAsaasPaymentId,
  type AsaasRefundResult,
} from "@/lib/payments/asaas";

export interface CancelBookingInput {
  bookingId: string;
  actorUid: string;
}

export interface CancelBookingResult {
  bookingId: string;
  refunded: boolean;
  refundId?: string;
  refundStatus?: string;
  refundAmount?: number;
}

export interface CancelTransaction {
  getBooking(bookingId: string): Promise<BookingRecord | null>;
  updateBooking(bookingId: string, updates: Record<string, unknown>): void;
}

export interface CancelStore {
  runAtomic<T>(work: (tx: CancelTransaction) => Promise<T>): Promise<T>;
}

export interface CancelBookingDeps {
  store: CancelStore;
  refundPayment?: (input: {
    paymentId: string;
    description?: string;
    value?: number;
  }) => Promise<AsaasRefundResult>;
  findPaymentId?: (externalReference: string) => Promise<string | undefined>;
  now?: () => Date;
}

type ClaimKind =
  | "not_found"
  | "forbidden"
  | "rejected"
  | "already_cancelled"
  | "in_progress"
  | "cancelled"
  | "needs_refund";

interface ClaimResult {
  kind: ClaimKind;
  booking?: BookingRecord;
  error?: CancelBookingError;
  result?: CancelBookingResult;
  paymentId?: string;
  paidAmount?: number;
}

function applyBookingUpdates(
  current: BookingRecord,
  updates: Record<string, unknown>,
): BookingRecord {
  const next: BookingRecord = { ...current };
  if (typeof updates.status === "string") {
    next.status = updates.status as BookingRecord["status"];
  }
  if (typeof updates.paymentId === "string") {
    next.paymentId = updates.paymentId;
  }
  if (typeof updates.refundId === "string") {
    next.refundId = updates.refundId;
  }
  if (updates.refundId === null) {
    next.refundId = undefined;
  }
  if (typeof updates.refundStatus === "string") {
    next.refundStatus = updates.refundStatus;
  }
  if (updates.refundStatus === null) {
    next.refundStatus = undefined;
  }
  if (typeof updates.refundAmount === "number") {
    next.refundAmount = updates.refundAmount;
  }
  if (updates.refundLockUntil instanceof Date) {
    next.refundLockUntil = updates.refundLockUntil;
  }
  if (updates.refundLockUntil === null) {
    next.refundLockUntil = undefined;
  }
  return next;
}

export function createMemoryCancelStore(
  bookings: Map<string, BookingRecord> = new Map(),
): CancelStore & { bookings: Map<string, BookingRecord> } {
  let queue = Promise.resolve();

  return {
    bookings,
    runAtomic<T>(work: (tx: CancelTransaction) => Promise<T>): Promise<T> {
      const run = queue.then(async () => {
        const pending: Array<[string, Record<string, unknown>]> = [];
        const tx: CancelTransaction = {
          async getBooking(bookingId) {
            return bookings.get(bookingId) ?? null;
          },
          updateBooking(bookingId, updates) {
            pending.push([bookingId, updates]);
          },
        };
        const result = await work(tx);
        for (const [id, updates] of pending) {
          const current = bookings.get(id);
          if (!current) {
            continue;
          }
          bookings.set(id, applyBookingUpdates(current, updates));
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

function toCancelError(error: unknown): CancelBookingError {
  if (error instanceof CancelBookingError) {
    return error;
  }
  const message = error instanceof Error ? error.message : CANCEL_ERRORS.refundFailed;
  if (message.includes("tempo limite")) {
    return new CancelBookingError("refund_timeout", 504, CANCEL_ERRORS.refundTimeout);
  }
  return new CancelBookingError("refund_failed", 502, message || CANCEL_ERRORS.refundFailed);
}

async function claimCancellation(
  store: CancelStore,
  input: CancelBookingInput,
  now: Date,
): Promise<ClaimResult> {
  return store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(input.bookingId);
    if (!booking) {
      return { kind: "not_found", error: new CancelBookingError("not_found", 404, CANCEL_ERRORS.notFound) };
    }

    let actor;
    try {
      actor = resolveCancelActor(booking, input.actorUid);
    } catch (error) {
      return { kind: "forbidden", booking, error: toCancelError(error) };
    }

    const decision = decideCancellation({
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      scheduledAt: booking.scheduledAt,
      actor,
      now,
    });

    if (decision.reason === "already_cancelled") {
      return {
        kind: "already_cancelled",
        booking,
        error: rejectionError(decision),
      };
    }

    if (!decision.canCancel) {
      return { kind: "rejected", booking, error: rejectionError(decision) };
    }

    if (!decision.willRefund) {
      tx.updateBooking(booking.id, {
        status: "cancelled",
        refundLockUntil: null,
      });
      return {
        kind: "cancelled",
        booking,
        result: { bookingId: booking.id, refunded: false },
      };
    }

    if (hasRecordedRefund(booking)) {
      tx.updateBooking(booking.id, {
        status: "cancelled",
        refundLockUntil: null,
      });
      return {
        kind: "cancelled",
        booking,
        result: {
          bookingId: booking.id,
          refunded: true,
          refundId: booking.refundId,
          refundStatus: booking.refundStatus,
          refundAmount: booking.refundAmount,
        },
      };
    }

    if (isRefundClaimActive(booking, now)) {
      return {
        kind: "in_progress",
        booking,
        error: new CancelBookingError("in_progress", 409, CANCEL_ERRORS.inProgress),
      };
    }

    tx.updateBooking(booking.id, {
      refundStatus: REFUND_CLAIM_STATUS,
      refundLockUntil: new Date(now.getTime() + REFUND_CLAIM_MS),
    });

    return {
      kind: "needs_refund",
      booking,
      paymentId: resolveAsaasPaymentId(booking),
      paidAmount: booking.price,
    };
  });
}

async function clearRefundClaim(store: CancelStore, bookingId: string, now: Date): Promise<void> {
  await store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(bookingId);
    if (!booking || booking.status === "cancelled" || hasRecordedRefund(booking)) {
      return;
    }
    if (!isRefundClaimActive(booking, now) && booking.refundStatus !== REFUND_CLAIM_STATUS) {
      return;
    }
    tx.updateBooking(booking.id, {
      refundStatus: null,
      refundLockUntil: null,
    });
  });
}

async function finalizeRefund(
  store: CancelStore,
  bookingId: string,
  paymentId: string,
  refund: AsaasRefundResult,
  paidAmount: number,
): Promise<CancelBookingResult> {
  const refundAmount = capRefundAmount(paidAmount, refund.refundAmount);
  const refundId = refund.refundId ?? refund.paymentId ?? paymentId;
  const refundStatus = refund.status ?? "REFUNDED";

  return store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(bookingId);
    if (!booking) {
      throw new CancelBookingError("not_found", 404, CANCEL_ERRORS.notFound);
    }
    if (booking.status === "cancelled" && hasRecordedRefund(booking)) {
      return {
        bookingId,
        refunded: true,
        refundId: booking.refundId,
        refundStatus: booking.refundStatus,
        refundAmount: booking.refundAmount,
      };
    }

    tx.updateBooking(booking.id, {
      status: "cancelled",
      paymentId,
      refundId,
      refundStatus,
      refundAmount,
      refundLockUntil: null,
    });

    return {
      bookingId,
      refunded: true,
      refundId,
      refundStatus,
      refundAmount,
    };
  });
}

export async function executeCancelBooking(
  input: CancelBookingInput,
  deps: CancelBookingDeps,
): Promise<CancelBookingResult> {
  const store = deps.store;
  const now = deps.now?.() ?? new Date();
  const refundPayment = deps.refundPayment ?? refundAsaasPayment;
  const findPaymentId = deps.findPaymentId ?? findAsaasPaymentIdByExternalReference;

  const claimed = await claimCancellation(store, input, now);
  if (claimed.error) {
    throw claimed.error;
  }
  if (claimed.kind === "cancelled" && claimed.result) {
    return claimed.result;
  }
  if (claimed.kind !== "needs_refund" || !claimed.booking) {
    throw new CancelBookingError("not_cancellable", 409, CANCEL_ERRORS.notCancellable);
  }

  const paidAmount = claimed.paidAmount ?? claimed.booking.price;
  let paymentId = claimed.paymentId;
  if (!paymentId) {
    paymentId = await findPaymentId(claimed.booking.id);
  }
  if (!paymentId) {
    await clearRefundClaim(store, claimed.booking.id, now);
    throw new CancelBookingError("missing_payment", 409, CANCEL_ERRORS.missingPayment);
  }

  let refund: AsaasRefundResult;
  try {
    refund = await refundPayment({
      paymentId,
      description: "Cancelamento da aula no Aprendiz Bay",
      value: capRefundAmount(paidAmount),
    });
  } catch (error) {
    await clearRefundClaim(store, claimed.booking.id, now).catch(() => undefined);
    throw toCancelError(error);
  }

  return finalizeRefund(store, claimed.booking.id, paymentId, refund, paidAmount);
}
