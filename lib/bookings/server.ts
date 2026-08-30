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
import { generateMeetingUrl } from "@/lib/bookings/meeting";
import type { Booking, BookingStatus, BookingType, PaymentStatus } from "@/lib/bookings/types";

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
  paymentStatus?: PaymentStatus;
  paymentId?: string;
  asaasCheckoutId?: string;
  meetingUrl?: string;
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
    paymentStatus: (data.paymentStatus as PaymentStatus | undefined) ?? "unpaid",
    paymentId: data.paymentId ? String(data.paymentId) : undefined,
    asaasCheckoutId: data.asaasCheckoutId ? String(data.asaasCheckoutId) : undefined,
    meetingUrl: data.meetingUrl ? String(data.meetingUrl) : undefined,
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
