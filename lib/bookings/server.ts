/**
 * Hostinger audit — firebase-admin (Next.js server modules only)
 *
 * confirmBookingWithMeetingUrl is for payment webhooks / server-side flows. Not wired to
 * Express yet. No hostinger-next page bundle references this file today.
 *
 * Not imported by server.js or server/api/. Production Express must not require this module.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { toScheduledDate } from "@/lib/bookings/cancellation";
import {
  executeCancelBooking,
  type CancelBookingInput as ExecuteCancelInput,
  type CancelStore,
  type CancelTransaction,
} from "@/lib/bookings/cancel-booking";
import {
  completeLessonForActor,
} from "@/lib/bookings/complete-lesson";
import { createIndividualBookingForStudent } from "@/lib/bookings/create-booking";
import { createCollectiveBookingForStudent } from "@/lib/hubs/join-and-book";
import { generateMeetingUrl } from "@/lib/bookings/meeting";
import {
  notifyConfirmedBooking,
  notifyLessonCancelled,
  notifyLessonCompleted,
  notifyRefundCompleted,
  safeNotify,
} from "@/lib/notifications/server";
import type { Booking, BookingStatus, BookingType, PaymentStatus } from "@/lib/bookings/types";
import type { BookingFeeSplit } from "@/lib/payments/fees";

let adminApp: App | undefined;

function getAdminFirestore(): Firestore | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (!adminApp) {
    adminApp =
      getApps().length > 0
        ? getApps()[0]!
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });
  }

  return getFirestore(adminApp);
}

function requireAdminFirestore(): Firestore {
  const db = getAdminFirestore();
  if (!db) {
    throw new Error("Firebase Admin SDK is not configured.");
  }
  return db;
}

export interface BookingRecord {
  id: string;
  studentId: string;
  tutorId: string;
  hubId?: string;
  type: BookingType;
  status: BookingStatus;
  price: number;
  platformFee?: number;
  tutorAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentId?: string;
  mercadopagoPaymentStatus?: string;
  asaasCheckoutId?: string;
  asaasCheckoutExpiresAt?: Date;
  paymentCheckoutId?: string;
  paymentCheckoutUrl?: string;
  paymentCheckoutExpiresAt?: Date;
  checkoutLockUntil?: Date;
  refundId?: string;
  refundStatus?: string;
  refundAmount?: number;
  refundLockUntil?: Date;
  meetingUrl?: string;
  scheduledAt: Date;
  completedAt?: Date;
  slotKey?: string;
}

function optionalDate(value: unknown): Date | undefined {
  if (value == null) {
    return undefined;
  }
  const date = toScheduledDate(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function mapBookingRecord(
  id: string,
  data: Record<string, unknown>,
): BookingRecord {
  return {
    id,
    studentId: String(data.studentId ?? ""),
    tutorId: String(data.tutorId ?? ""),
    hubId: data.hubId ? String(data.hubId) : undefined,
    type: data.type as Booking["type"],
    status: data.status as BookingStatus,
    price: Number(data.price ?? 0),
    platformFee:
      typeof data.platformFee === "number" && Number.isFinite(data.platformFee)
        ? data.platformFee
        : undefined,
    tutorAmount:
      typeof data.tutorAmount === "number" && Number.isFinite(data.tutorAmount)
        ? data.tutorAmount
        : undefined,
    paymentStatus: (data.paymentStatus as PaymentStatus | undefined) ?? "unpaid",
    paymentId: data.paymentId ? String(data.paymentId) : undefined,
    mercadopagoPaymentStatus: data.mercadopagoPaymentStatus
      ? String(data.mercadopagoPaymentStatus)
      : undefined,
    asaasCheckoutId: data.asaasCheckoutId ? String(data.asaasCheckoutId) : undefined,
    asaasCheckoutExpiresAt: optionalDate(data.asaasCheckoutExpiresAt),
    paymentCheckoutId: data.paymentCheckoutId ? String(data.paymentCheckoutId) : undefined,
    paymentCheckoutUrl: data.paymentCheckoutUrl ? String(data.paymentCheckoutUrl) : undefined,
    paymentCheckoutExpiresAt: optionalDate(data.paymentCheckoutExpiresAt),
    checkoutLockUntil: optionalDate(data.checkoutLockUntil),
    refundId: data.refundId ? String(data.refundId) : undefined,
    refundStatus: data.refundStatus ? String(data.refundStatus) : undefined,
    refundAmount:
      typeof data.refundAmount === "number" && Number.isFinite(data.refundAmount)
        ? data.refundAmount
        : undefined,
    refundLockUntil: optionalDate(data.refundLockUntil),
    meetingUrl: data.meetingUrl ? String(data.meetingUrl) : undefined,
    scheduledAt: toScheduledDate(data.scheduledAt),
    completedAt: optionalDate(data.completedAt),
    slotKey: data.slotKey ? String(data.slotKey) : undefined,
  };
}

export async function getBookingById(bookingId: string): Promise<BookingRecord | null> {
  const snapshot = await requireAdminFirestore().collection("bookings").doc(bookingId).get();
  if (!snapshot.exists) {
    return null;
  }

  return mapBookingRecord(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);
}

export async function saveBookingCheckoutId(
  bookingId: string,
  asaasCheckoutId: string,
): Promise<void> {
  await requireAdminFirestore().collection("bookings").doc(bookingId).update({
    asaasCheckoutId,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function saveBookingFeeSplit(
  bookingId: string,
  split: BookingFeeSplit,
): Promise<void> {
  await requireAdminFirestore().collection("bookings").doc(bookingId).update({
    platformFee: split.platformFee,
    tutorAmount: split.tutorAmount,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export interface ConfirmBookingPaymentInput {
  paymentId?: string;
  asaasCheckoutId?: string;
}

/**
 * Direct confirmation write. Payment webhooks must use
 * `processAsaasPaymentWebhook` so receipts stay idempotent.
 */
export async function confirmBookingWithMeetingUrl(
  bookingId: string,
  payment?: ConfirmBookingPaymentInput,
): Promise<void> {
  const db = requireAdminFirestore();
  const updates: Record<string, unknown> = {
    status: "confirmed",
    paymentStatus: "paid",
    meetingUrl: generateMeetingUrl(bookingId),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (payment?.paymentId) {
    updates.paymentId = payment.paymentId;
  }
  if (payment?.asaasCheckoutId) {
    updates.asaasCheckoutId = payment.asaasCheckoutId;
  }

  await db.collection("bookings").doc(bookingId).update(updates);
  await safeNotify(() => notifyConfirmedBooking(bookingId), "confirmed_booking");
}

export interface CancelBookingInput {
  bookingId: string;
  actorUid: string;
  /** Ignored. The authenticated uid is matched to studentId/tutorId on the server. */
  actor?: string;
}

function createFirestoreCancelStore(db: Firestore): CancelStore {
  return {
    async runAtomic<T>(work: (tx: CancelTransaction) => Promise<T>): Promise<T> {
      return db.runTransaction(async (transaction) => {
        const pendingWrites: Array<() => void> = [];
        const seen = new Map<string, BookingRecord>();
        const tx: CancelTransaction = {
          async getBooking(bookingId) {
            const snap = await transaction.get(db.collection("bookings").doc(bookingId));
            if (!snap.exists) {
              return null;
            }
            const record = mapBookingRecord(
              snap.id,
              (snap.data() ?? {}) as Record<string, unknown>,
            );
            seen.set(bookingId, record);
            return record;
          },
          updateBooking(bookingId, updates) {
            const ref = db.collection("bookings").doc(bookingId);
            const payload: Record<string, unknown> = {
              ...updates,
              updatedAt: FieldValue.serverTimestamp(),
            };
            if (payload.refundLockUntil === null) {
              payload.refundLockUntil = FieldValue.delete();
            }
            if (payload.refundStatus === null) {
              payload.refundStatus = FieldValue.delete();
            }
            pendingWrites.push(() => {
              transaction.update(ref, payload);
              const booking = seen.get(bookingId);
              if (updates.status === "cancelled" && booking?.slotKey) {
                transaction.delete(db.collection("lessonSlots").doc(booking.slotKey));
              }
            });
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

export async function completeLessonAsActor(input: {
  bookingId: string;
  actorUid: string;
  actorRole?: string;
}): Promise<{ bookingId: string; status: "completed" }> {
  const db = requireAdminFirestore();
  const result = await completeLessonForActor(db, input, {
    timestamp: FieldValue.serverTimestamp(),
  });

  try {
    const { queueTutorPayoutForCompletedLesson } = await import("@/lib/payments/tutor-payouts");
    await queueTutorPayoutForCompletedLesson(db, { bookingId: result.bookingId });
  } catch (error) {
    const { captureServerException } = await import("@/lib/observability/sentry-server");
    captureServerException(error);
  }

  await safeNotify(() => notifyLessonCompleted(result.bookingId), "lesson_completed");

  return result;
}

export async function createIndividualBookingAsStudent(input: {
  actorUid: string;
  actorRole?: string;
  tutorId?: unknown;
  type?: unknown;
  scheduledAt?: unknown;
}): Promise<{ bookingId: string; slotKey: string }> {
  const db = requireAdminFirestore();
  return createIndividualBookingForStudent(db, input, {
    timestamp: FieldValue.serverTimestamp(),
  });
}

export async function createCollectiveBookingAsStudent(input: {
  actorUid: string;
  actorRole?: string;
  hubId?: unknown;
}): Promise<{ bookingId: string; hubId: string; price: number }> {
  const db = requireAdminFirestore();
  return createCollectiveBookingForStudent(db, input, {
    timestamp: FieldValue.serverTimestamp(),
    deleteField: FieldValue.delete(),
  });
}

export async function cancelBookingWithRefund(
  input: CancelBookingInput,
): Promise<{
  bookingId: string;
  refunded: boolean;
  refundId?: string;
  refundStatus?: string;
  refundAmount?: number;
}> {
  const cancelInput: ExecuteCancelInput = {
    bookingId: input.bookingId,
    actorUid: input.actorUid,
  };
  const result = await executeCancelBooking(cancelInput, {
    store: createFirestoreCancelStore(requireAdminFirestore()),
  });

  await safeNotify(() => notifyLessonCancelled(result.bookingId), "lesson_cancelled");
  if (result.refunded) {
    await safeNotify(
      () => notifyRefundCompleted(result.bookingId, result.refundAmount),
      "refund_completed",
    );
  }

  return result;
}
