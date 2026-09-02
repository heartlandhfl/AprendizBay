import type { Firestore } from "firebase-admin/firestore";
import {
  COMMISSIONS_COLLECTION,
  FACILITATORS_COLLECTION,
  type CommissionStatus,
  type FacilitatorRecord,
} from "@/lib/facilitators/schema";
import { mapFacilitatorRecord } from "@/lib/facilitators/attach-referral";
import { matureFacilitatorCommissions } from "@/lib/facilitators/mature-commissions";

export interface FacilitatorDashboardMetrics {
  referralCode: string;
  referralLink: string;
  displayName: string;
  clicks: number;
  signups: number;
  activeUsers: number;
  paidBookings: number;
  commissionTotals: Record<CommissionStatus, number>;
  commissionAmounts: Record<CommissionStatus, number>;
}

function emptyCommissionMap(): Record<CommissionStatus, number> {
  return {
    pending: 0,
    locked: 0,
    approved: 0,
    available: 0,
    paid: 0,
    reversed: 0,
  };
}

export async function getFacilitatorDashboard(
  db: Firestore,
  userId: string,
  siteOrigin: string,
): Promise<FacilitatorDashboardMetrics | null> {
  const facilitatorSnap = await db.collection(FACILITATORS_COLLECTION).doc(userId).get();
  if (!facilitatorSnap.exists) {
    return null;
  }

  await matureFacilitatorCommissions(db);

  const facilitator = mapFacilitatorRecord(
    facilitatorSnap.id,
    facilitatorSnap.data() as Record<string, unknown>,
  );

  const commissionsSnap = await db
    .collection(COMMISSIONS_COLLECTION)
    .where("facilitatorId", "==", facilitator.facilitatorId)
    .get();

  const commissionTotals = emptyCommissionMap();
  const commissionAmounts = emptyCommissionMap();

  for (const doc of commissionsSnap.docs) {
    const status = (doc.data().status as CommissionStatus) ?? "pending";
    const amount =
      typeof doc.data().commissionAmount === "number" ? doc.data().commissionAmount : 0;
    commissionTotals[status] += 1;
    commissionAmounts[status] += amount;
  }

  const origin = siteOrigin.replace(/\/$/, "");
  const referralLink = origin
    ? `${origin}/r/${encodeURIComponent(facilitator.referralCode)}`
    : `/r/${encodeURIComponent(facilitator.referralCode)}`;

  return {
    referralCode: facilitator.referralCode,
    referralLink,
    displayName: facilitator.displayName,
    clicks: facilitator.stats.clicks,
    signups: facilitator.stats.signups,
    activeUsers: facilitator.stats.activeUsers,
    paidBookings: facilitator.stats.paidBookings,
    commissionTotals,
    commissionAmounts,
  };
}

export async function getFacilitatorForUser(
  db: Firestore,
  userId: string,
): Promise<FacilitatorRecord | null> {
  const snapshot = await db.collection(FACILITATORS_COLLECTION).doc(userId).get();
  if (!snapshot.exists) {
    return null;
  }
  return mapFacilitatorRecord(snapshot.id, snapshot.data() as Record<string, unknown>);
}
