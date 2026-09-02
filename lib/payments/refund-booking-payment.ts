import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { mapBookingRecord, type BookingRecord } from "@/lib/bookings/server";
import { getAdminApp } from "@/lib/firebase/admin";
import { createPaymentGateway } from "@/lib/payments/gateway/factory";
import type { RefundResult } from "@/lib/payments/gateway/types";
import {
  PAYMENTS_COLLECTION,
  paymentRecordDocId,
} from "@/lib/payments/payment-records";
import { getMercadoPagoAccessToken } from "@/lib/payments/mercadopago";

export const REFUND_ERRORS = {
  notFound: "Reserva não encontrada.",
  notAuthorized: "Você não tem permissão para estornar esta reserva.",
  notPaid: "Esta reserva ainda não foi paga.",
  missingPaymentId: "Não foi possível localizar o pagamento desta reserva.",
  providerMissing: "A configuração de pagamento não está disponível.",
  adminMissing: "Não foi possível preparar o estorno.",
} as const;

export interface RefundBookingPaymentInput {
  actorUid: string;
  bookingId: string;
  description?: string;
}

export interface RefundBookingPaymentSuccess {
  ok: true;
  bookingId: string;
  paymentId: string;
  refundId?: string;
  refundAmount?: number;
}

export interface RefundBookingPaymentFailure {
  ok: false;
  status: number;
  error: string;
}

export type RefundBookingPaymentResult =
  | RefundBookingPaymentSuccess
  | RefundBookingPaymentFailure;

export interface RefundTransaction {
  getBooking(bookingId: string): Promise<BookingRecord | null>;
  updateBooking(bookingId: string, updates: Record<string, unknown>): void;
  updatePaymentRecord(recordId: string, updates: Record<string, unknown>): void;
}

export interface RefundStore {
  runAtomic<T>(work: (tx: RefundTransaction) => Promise<T>): Promise<T>;
}

export interface RefundBookingPaymentDeps {
  store?: RefundStore;
  refundPayment?: (paymentId: string, description?: string) => Promise<RefundResult>;
  requireMercadoPagoConfigured?: () => void;
}

function fail(status: number, error: string): RefundBookingPaymentFailure {
  return { ok: false, status, error };
}

function canRefundBooking(booking: BookingRecord, actorUid: string): boolean {
  return booking.studentId === actorUid || booking.tutorId === actorUid;
}

function getDefaultStore(): RefundStore {
  const db = getFirestore(getAdminApp());
  return {
    async runAtomic<T>(work: (tx: RefundTransaction) => Promise<T>): Promise<T> {
      return db.runTransaction(async (transaction) => {
        const pendingWrites: Array<() => void> = [];
        const tx: RefundTransaction = {
          async getBooking(bookingId) {
            const snap = await transaction.get(db.collection("bookings").doc(bookingId));
            if (!snap.exists) {
              return null;
            }
            return mapBookingRecord(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
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
          updatePaymentRecord(recordId, updates) {
            const ref = db.collection(PAYMENTS_COLLECTION).doc(recordId);
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

function defaultRefundPayment(paymentId: string, description?: string): Promise<RefundResult> {
  const gateway = createPaymentGateway("mercadopago");
  return gateway.refund({
    paymentId,
    description: description ?? "Estorno da aula no Aprendiz Bay",
  });
}

export async function refundBookingPayment(
  input: RefundBookingPaymentInput,
  deps: RefundBookingPaymentDeps = {},
): Promise<RefundBookingPaymentResult> {
  const store = deps.store ?? getDefaultStore();
  const refundPayment = deps.refundPayment ?? defaultRefundPayment;
  const requireMercadoPago = deps.requireMercadoPagoConfigured ?? getMercadoPagoAccessToken;

  let booking: BookingRecord | null;
  try {
    booking = await store.runAtomic((tx) => tx.getBooking(input.bookingId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Firebase Admin")) {
      return fail(503, REFUND_ERRORS.adminMissing);
    }
    throw error;
  }

  if (!booking) {
    return fail(404, REFUND_ERRORS.notFound);
  }
  if (!canRefundBooking(booking, input.actorUid)) {
    return fail(403, REFUND_ERRORS.notAuthorized);
  }
  if (booking.paymentStatus !== "paid") {
    return fail(409, REFUND_ERRORS.notPaid);
  }
  const paymentId = booking.paymentId?.trim();
  if (!paymentId) {
    return fail(409, REFUND_ERRORS.missingPaymentId);
  }

  try {
    requireMercadoPago();
  } catch {
    return fail(503, REFUND_ERRORS.providerMissing);
  }

  const refund = await refundPayment(paymentId, input.description);
  const recordId = paymentRecordDocId("mercadopago", paymentId);

  await store.runAtomic(async (tx) => {
    tx.updateBooking(booking!.id, {
      refundId: refund.refundId ?? paymentId,
      refundStatus: "refunded",
      refundAmount: refund.refundAmount,
      mercadopagoPaymentStatus: "refunded",
    });
    tx.updatePaymentRecord(recordId, {
      status: "refunded",
      refundId: refund.refundId,
      refundAmount: refund.refundAmount,
    });
  });

  return {
    ok: true,
    bookingId: booking.id,
    paymentId,
    refundId: refund.refundId,
    refundAmount: refund.refundAmount,
  };
}
