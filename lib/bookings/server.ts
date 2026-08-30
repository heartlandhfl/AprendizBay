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
import {
  decideCancellation,
  lateStudentCancellationError,
  toScheduledDate,
  type CancelActor,
} from "@/lib/bookings/cancellation";
import { generateMeetingUrl } from "@/lib/bookings/meeting";
import type { Booking, BookingStatus, BookingType, PaymentStatus } from "@/lib/bookings/types";
import type { BookingFeeSplit } from "@/lib/payments/fees";
import {
  refundMercadoPagoPayment,
  resolveMercadoPagoPaymentId,
} from "@/lib/payments/mercadopago";

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
  asaasCheckoutId?: string;
  mercadoPagoPaymentId?: string;
  refundId?: string;
  refundStatus?: string;
  refundAmount?: number;
  meetingUrl?: string;
  scheduledAt: Date;
}

export async function getBookingById(bookingId: string): Promise<BookingRecord | null> {
  const snapshot = await requireAdminFirestore().collection("bookings").doc(bookingId).get();
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
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
    asaasCheckoutId: data.asaasCheckoutId ? String(data.asaasCheckoutId) : undefined,
    mercadoPagoPaymentId: data.mercadoPagoPaymentId
      ? String(data.mercadoPagoPaymentId)
      : undefined,
    refundId: data.refundId ? String(data.refundId) : undefined,
    refundStatus: data.refundStatus ? String(data.refundStatus) : undefined,
    refundAmount:
      typeof data.refundAmount === "number" && Number.isFinite(data.refundAmount)
        ? data.refundAmount
        : undefined,
    meetingUrl: data.meetingUrl ? String(data.meetingUrl) : undefined,
    scheduledAt: toScheduledDate(data.scheduledAt),
  };
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

/** For payment webhooks or other server-side confirmation flows. */
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
}

export interface CancelBookingInput {
  bookingId: string;
  actorUid: string;
  actor: CancelActor;
}

export async function cancelBookingWithRefund(input: CancelBookingInput): Promise<{
  bookingId: string;
  refunded: boolean;
  refundId?: string;
}> {
  const booking = await getBookingById(input.bookingId);
  if (!booking) {
    throw new Error("Reserva não encontrada.");
  }

  if (input.actor === "student" && booking.studentId !== input.actorUid) {
    throw new Error("Você só pode cancelar as suas próprias reservas.");
  }

  if (input.actor === "tutor" && booking.tutorId !== input.actorUid) {
    throw new Error("Você só pode cancelar as reservas do seu painel.");
  }

  const decision = decideCancellation({
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    scheduledAt: booking.scheduledAt,
    actor: input.actor,
  });

  if (!decision.canCancel) {
    if (decision.reason === "late_student") {
      throw new Error(lateStudentCancellationError());
    }
    if (decision.reason === "already_cancelled") {
      throw new Error("Esta reserva já está cancelada.");
    }
    throw new Error("Esta reserva não pode ser cancelada.");
  }

  const updates: Record<string, unknown> = {
    status: "cancelled",
    updatedAt: FieldValue.serverTimestamp(),
  };

  let refunded = Boolean(booking.refundId);
  let refundId = booking.refundId;

  if (decision.willRefund && !booking.refundId) {
    const paymentId = resolveMercadoPagoPaymentId(booking);
    if (!paymentId) {
      throw new Error(
        "Não foi possível reembolsar: o identificador do pagamento no Mercado Pago está ausente.",
      );
    }

    const refund = await refundMercadoPagoPayment({
      paymentId,
      idempotencyKey: `booking-refund-${booking.id}`,
    });

    updates.refundId = refund.id;
    updates.refundStatus = refund.status ?? "approved";
    updates.refundAmount = refund.amount ?? booking.price;
    updates.mercadoPagoPaymentId = paymentId;
    refunded = true;
    refundId = refund.id;
  }

  await requireAdminFirestore().collection("bookings").doc(booking.id).update(updates);

  return {
    bookingId: booking.id,
    refunded,
    refundId,
  };
}
