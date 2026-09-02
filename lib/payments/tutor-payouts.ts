import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { mapBookingRecord, type BookingRecord } from "@/lib/bookings/server";
import { resolveBookingFeeSplit } from "@/lib/payments/fees";
import {
  buildPaymentLedgerDocId,
  buildTutorPayoutDocId,
  derivePaymentLedgerAmounts,
  PAYMENTS_COLLECTION,
  TUTOR_PAYOUTS_COLLECTION,
  type PaymentLedgerRecord,
  type TutorPayoutRecord,
} from "@/lib/payments/ledger/schema";
import { getPaymentProvider } from "@/lib/payments/gateway/factory";
import type { PaymentProvider } from "@/lib/payments/gateway/types";

export const TUTOR_PAYOUT_ERRORS = {
  bookingNotFound: "Reserva não encontrada.",
  notPaid: "Esta reserva ainda não foi paga.",
  paymentNotFound: "Não foi possível localizar o pagamento desta reserva.",
  invalidAmount: "O valor do repasse é inválido.",
} as const;

type PaymentLedgerSnapshot = Partial<PaymentLedgerRecord> & {
  bookingId?: string;
  amount?: number;
  tutorAmount?: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resolveProvider(booking: BookingRecord, payment?: PaymentLedgerSnapshot): PaymentProvider {
  if (payment?.provider === "asaas" || payment?.provider === "mercadopago") {
    return payment.provider;
  }
  return getPaymentProvider();
}

function buildLedgerDocId(
  booking: BookingRecord,
  payment: PaymentLedgerSnapshot | undefined,
  provider: PaymentProvider,
): string | undefined {
  if (payment?.paymentId) {
    return payment.paymentId;
  }
  const providerPaymentId = booking.paymentId?.trim();
  if (!providerPaymentId) {
    return undefined;
  }
  return buildPaymentLedgerDocId(provider, providerPaymentId);
}

export function resolveTutorPayoutAmount(
  booking: BookingRecord,
  payment?: PaymentLedgerSnapshot,
): number {
  const ledgerAmount = readNumber(payment?.tutorPayoutAmount);
  if (ledgerAmount != null && ledgerAmount >= 0) {
    return roundMoney(ledgerAmount);
  }

  const tutorGross = readNumber(payment?.tutorGrossAmount);
  if (tutorGross != null && tutorGross >= 0) {
    return roundMoney(tutorGross);
  }

  if (typeof booking.tutorAmount === "number" && Number.isFinite(booking.tutorAmount)) {
    return roundMoney(booking.tutorAmount);
  }

  const split = resolveBookingFeeSplit(booking);
  const derived = derivePaymentLedgerAmounts({
    grossAmount: booking.price,
    platformFee: split.platformFee,
    paymentProcessingFee: readNumber(payment?.paymentProcessingFee) ?? 0,
  });
  return derived.tutorPayoutAmount;
}

export async function findPaymentLedgerForBooking(
  db: Firestore,
  bookingId: string,
): Promise<{ docId: string; data: PaymentLedgerSnapshot } | null> {
  const snapshot = await db
    .collection(PAYMENTS_COLLECTION)
    .where("bookingId", "==", bookingId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0]!;
  return {
    docId: doc.id,
    data: doc.data() as PaymentLedgerSnapshot,
  };
}

export interface QueueTutorPayoutInput {
  bookingId: string;
}

export interface QueueTutorPayoutResult {
  payoutId: string;
  amount: number;
  created: boolean;
  skipped?: "already_paid";
}

export async function queueTutorPayoutForCompletedLesson(
  db: Firestore,
  input: QueueTutorPayoutInput,
): Promise<QueueTutorPayoutResult> {
  const bookingId = input.bookingId.trim();
  if (!bookingId) {
    throw new Error(TUTOR_PAYOUT_ERRORS.bookingNotFound);
  }

  const bookingSnap = await db.collection("bookings").doc(bookingId).get();
  if (!bookingSnap.exists) {
    throw new Error(TUTOR_PAYOUT_ERRORS.bookingNotFound);
  }
  const booking = mapBookingRecord(
    bookingSnap.id,
    (bookingSnap.data() ?? {}) as Record<string, unknown>,
  );
  if (booking.paymentStatus !== "paid") {
    throw new Error(TUTOR_PAYOUT_ERRORS.notPaid);
  }

  const payment = await findPaymentLedgerForBooking(db, bookingId);
  const provider = resolveProvider(booking, payment?.data);
  const ledgerDocId = payment?.docId ?? buildLedgerDocId(booking, payment?.data, provider);
  if (!ledgerDocId) {
    throw new Error(TUTOR_PAYOUT_ERRORS.paymentNotFound);
  }

  const amount = resolveTutorPayoutAmount(booking, payment?.data);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(TUTOR_PAYOUT_ERRORS.invalidAmount);
  }

  const payoutId = buildTutorPayoutDocId(bookingId);
  const payoutRef = db.collection(TUTOR_PAYOUTS_COLLECTION).doc(payoutId);

  return db.runTransaction(async (transaction) => {
    const existingSnap = await transaction.get(payoutRef);
    if (existingSnap.exists) {
      const existing = existingSnap.data() as TutorPayoutRecord;
      if (existing.status === "paid") {
        return { payoutId, amount: existing.amount, created: false, skipped: "already_paid" };
      }
    }

    const record: TutorPayoutRecord = {
      payoutId,
      tutorId: booking.tutorId,
      bookingId,
      amount,
      status: "pending",
      paymentIds: [ledgerDocId],
      ...(existingSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    };

    transaction.set(payoutRef, record, { merge: true });
    return { payoutId, amount, created: !existingSnap.exists };
  });
}
