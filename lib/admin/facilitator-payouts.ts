import { FieldValue, type Firestore } from "firebase-admin/firestore";
import {
  COMMISSIONS_COLLECTION,
  FACILITATOR_PAYOUTS_COLLECTION,
  type FacilitatorPayoutRecord,
  type FacilitatorPayoutStatus,
} from "@/lib/facilitators/schema";
import { matureFacilitatorCommissions } from "@/lib/facilitators/mature-commissions";

export interface AdminFacilitatorPayoutListItem {
  payoutId: string;
  facilitatorId: string;
  facilitatorName: string | null;
  commissionIds: string[];
  amount: number;
  status: FacilitatorPayoutStatus;
  createdAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
}

export const ADMIN_FACILITATOR_PAYOUT_ERRORS = {
  notFound: "Repasse de facilitador não encontrado.",
  notPending: "Só é possível aprovar repasses pendentes.",
  notApproved: "Só é possível marcar repasses aprovados como pagos.",
  noCommissions: "Não há comissões disponíveis para este facilitador.",
} as const;

function timestampToIso(value: unknown): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    const record = value as { toDate?: () => Date; _seconds?: number; seconds?: number };
    if (typeof record.toDate === "function") {
      return record.toDate().toISOString();
    }
    const seconds = record._seconds ?? record.seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return null;
}

async function resolveFacilitatorName(db: Firestore, facilitatorId: string): Promise<string | null> {
  const snapshot = await db.collection("facilitators").doc(facilitatorId).get();
  if (!snapshot.exists) {
    return null;
  }
  const name = snapshot.data()?.displayName;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function mapPayoutRecord(
  docId: string,
  data: Record<string, unknown>,
  facilitatorName: string | null,
): AdminFacilitatorPayoutListItem {
  const commissionIds = Array.isArray(data.commissionIds)
    ? data.commissionIds.filter((value): value is string => typeof value === "string")
    : [];

  return {
    payoutId: docId,
    facilitatorId: String(data.facilitatorId ?? ""),
    facilitatorName,
    commissionIds,
    amount: typeof data.amount === "number" ? data.amount : 0,
    status: (data.status as FacilitatorPayoutStatus) ?? "pending",
    createdAt: timestampToIso(data.createdAt),
    approvedAt: timestampToIso(data.approvedAt),
    paidAt: timestampToIso(data.paidAt),
  };
}

export async function listAdminFacilitatorPayouts(
  db: Firestore,
  status: FacilitatorPayoutStatus = "pending",
): Promise<AdminFacilitatorPayoutListItem[]> {
  const snapshot = await db
    .collection(FACILITATOR_PAYOUTS_COLLECTION)
    .where("status", "==", status)
    .get();

  const names = new Map<string, string | null>();
  const items: AdminFacilitatorPayoutListItem[] = [];

  for (const doc of snapshot.docs) {
    const facilitatorId = String(doc.data().facilitatorId ?? "");
    if (!names.has(facilitatorId)) {
      names.set(facilitatorId, await resolveFacilitatorName(db, facilitatorId));
    }
    items.push(mapPayoutRecord(doc.id, doc.data(), names.get(facilitatorId) ?? null));
  }

  return items.sort((left, right) => {
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightTime - leftTime;
  });
}

export async function approveFacilitatorPayout(
  db: Firestore,
  facilitatorId: string,
): Promise<AdminFacilitatorPayoutListItem> {
  await matureFacilitatorCommissions(db);

  const availableSnapshot = await db
    .collection(COMMISSIONS_COLLECTION)
    .where("facilitatorId", "==", facilitatorId)
    .where("status", "==", "available")
    .get();

  if (availableSnapshot.empty) {
    throw new Error(ADMIN_FACILITATOR_PAYOUT_ERRORS.noCommissions);
  }

  const commissionIds = availableSnapshot.docs.map((doc) => doc.id);
  const amount = availableSnapshot.docs.reduce((sum, doc) => {
    const value = doc.data().commissionAmount;
    return sum + (typeof value === "number" ? value : 0);
  }, 0);

  const payoutRef = db.collection(FACILITATOR_PAYOUTS_COLLECTION).doc();
  const payoutId = payoutRef.id;

  await db.runTransaction(async (transaction) => {
    transaction.set(payoutRef, {
      payoutId,
      facilitatorId,
      commissionIds,
      amount: Math.round(amount * 100) / 100,
      status: "approved",
      createdAt: FieldValue.serverTimestamp(),
      approvedAt: FieldValue.serverTimestamp(),
    } satisfies FacilitatorPayoutRecord);

    for (const doc of availableSnapshot.docs) {
      transaction.update(doc.ref, {
        status: "approved",
        payoutId,
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  const facilitatorName = await resolveFacilitatorName(db, facilitatorId);
  return mapPayoutRecord(
    payoutId,
    {
      payoutId,
      facilitatorId,
      commissionIds,
      amount,
      status: "approved",
      approvedAt: new Date(),
      createdAt: new Date(),
    },
    facilitatorName,
  );
}

export async function markFacilitatorPayoutPaid(
  db: Firestore,
  payoutId: string,
): Promise<AdminFacilitatorPayoutListItem> {
  const ref = db.collection(FACILITATOR_PAYOUTS_COLLECTION).doc(payoutId);

  const updated = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new Error(ADMIN_FACILITATOR_PAYOUT_ERRORS.notFound);
    }

    const current = snapshot.data() as FacilitatorPayoutRecord;
    if (current.status !== "approved") {
      throw new Error(ADMIN_FACILITATOR_PAYOUT_ERRORS.notApproved);
    }

    transaction.update(ref, {
      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
    });

    for (const commissionId of current.commissionIds) {
      const commissionRef = db.collection(COMMISSIONS_COLLECTION).doc(commissionId);
      transaction.update(commissionRef, {
        status: "paid",
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return current;
  });

  const facilitatorName = await resolveFacilitatorName(db, updated.facilitatorId);
  return mapPayoutRecord(
    payoutId,
    {
      ...updated,
      status: "paid",
      paidAt: new Date(),
    },
    facilitatorName,
  );
}

export async function listAvailableFacilitatorCommissionsSummary(
  db: Firestore,
): Promise<Array<{ facilitatorId: string; facilitatorName: string | null; count: number; amount: number }>> {
  await matureFacilitatorCommissions(db);

  const snapshot = await db
    .collection(COMMISSIONS_COLLECTION)
    .where("status", "==", "available")
    .get();

  const grouped = new Map<string, { count: number; amount: number }>();
  for (const doc of snapshot.docs) {
    const facilitatorId = String(doc.data().facilitatorId ?? "");
    const current = grouped.get(facilitatorId) ?? { count: 0, amount: 0 };
    const amount =
      typeof doc.data().commissionAmount === "number" ? doc.data().commissionAmount : 0;
    grouped.set(facilitatorId, {
      count: current.count + 1,
      amount: current.amount + amount,
    });
  }

  const summaries = [];
  for (const [facilitatorId, totals] of grouped.entries()) {
    summaries.push({
      facilitatorId,
      facilitatorName: await resolveFacilitatorName(db, facilitatorId),
      count: totals.count,
      amount: Math.round(totals.amount * 100) / 100,
    });
  }

  return summaries.sort((left, right) => right.amount - left.amount);
}
