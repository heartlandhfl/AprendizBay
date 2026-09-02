import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { BookingRecord } from "@/lib/bookings/server";
import {
  addDays,
  getCommissionRefundWindowDays,
  getFacilitatorCommissionRatePercent,
} from "@/lib/facilitators/config";
import {
  buildCommissionDocId,
  COMMISSIONS_COLLECTION,
  FACILITATORS_COLLECTION,
  REFERRALS_COLLECTION,
  type CommissionRecord,
  type ReferralRecord,
} from "@/lib/facilitators/schema";
import { resolveBookingFeeSplit } from "@/lib/payments/fees";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

async function isFirstPaidBookingForStudent(
  db: Firestore,
  studentId: string,
  currentBookingId: string,
): Promise<boolean> {
  const snapshot = await db
    .collection("bookings")
    .where("studentId", "==", studentId)
    .where("paymentStatus", "==", "paid")
    .get();

  if (snapshot.empty) {
    return true;
  }

  if (snapshot.size === 1 && snapshot.docs[0]?.id === currentBookingId) {
    return true;
  }

  return false;
}

export async function maybeCreateFacilitatorCommission(
  db: Firestore,
  booking: BookingRecord,
  paymentId: string,
): Promise<CommissionRecord | null> {
  const referralSnap = await db.collection(REFERRALS_COLLECTION).doc(booking.studentId).get();
  if (!referralSnap.exists) {
    return null;
  }

  const referral = referralSnap.data() as ReferralRecord;
  if (referral.status !== "active") {
    return null;
  }

  const firstPaid = await isFirstPaidBookingForStudent(db, booking.studentId, booking.id);
  if (!firstPaid) {
    return null;
  }

  const commissionId = buildCommissionDocId(booking.id);
  const existing = await db.collection(COMMISSIONS_COLLECTION).doc(commissionId).get();
  if (existing.exists) {
    return existing.data() as CommissionRecord;
  }

  const facilitatorSnap = await db
    .collection(FACILITATORS_COLLECTION)
    .doc(referral.facilitatorId)
    .get();
  if (!facilitatorSnap.exists) {
    return null;
  }

  const facilitator = facilitatorSnap.data() ?? {};
  const commissionRatePercent =
    typeof facilitator.commissionRatePercent === "number"
      ? facilitator.commissionRatePercent
      : getFacilitatorCommissionRatePercent();

  const feeSplit = resolveBookingFeeSplit(booking);
  const commissionAmount = roundMoney(
    feeSplit.platformFee * (commissionRatePercent / 100),
  );

  const now = new Date();
  const refundWindowEndsAt = addDays(now, getCommissionRefundWindowDays());

  const record: CommissionRecord = {
    commissionId,
    facilitatorId: referral.facilitatorId,
    referralId: referral.referralId,
    studentId: booking.studentId,
    bookingId: booking.id,
    paymentId,
    grossAmount: booking.price,
    platformFee: feeSplit.platformFee,
    commissionAmount,
    status: "pending",
    refundWindowEndsAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.runTransaction(async (transaction) => {
    const commissionRef = db.collection(COMMISSIONS_COLLECTION).doc(commissionId);
    const commissionSnap = await transaction.get(commissionRef);
    if (commissionSnap.exists) {
      return;
    }

    transaction.set(commissionRef, record);
    transaction.update(db.collection(FACILITATORS_COLLECTION).doc(referral.facilitatorId), {
      "stats.paidBookings": FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return record;
}

export async function reverseFacilitatorCommissionForBooking(
  db: Firestore,
  bookingId: string,
): Promise<void> {
  const commissionId = buildCommissionDocId(bookingId);
  const ref = db.collection(COMMISSIONS_COLLECTION).doc(commissionId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return;
  }

  const current = snapshot.data() as CommissionRecord;
  if (current.status === "paid" || current.status === "reversed") {
    return;
  }

  await ref.update({
    status: "reversed",
    reversedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
