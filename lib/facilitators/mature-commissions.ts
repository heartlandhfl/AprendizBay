import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { COMMISSIONS_COLLECTION, type CommissionRecord } from "@/lib/facilitators/schema";

function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "object") {
    const record = value as { toDate?: () => Date; _seconds?: number; seconds?: number };
    if (typeof record.toDate === "function") {
      return record.toDate();
    }
    const seconds = record._seconds ?? record.seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000);
    }
  }
  return null;
}

export interface MatureCommissionsResult {
  locked: number;
  available: number;
}

export async function matureFacilitatorCommissions(
  db: Firestore,
  now: Date = new Date(),
): Promise<MatureCommissionsResult> {
  const pendingSnapshot = await db
    .collection(COMMISSIONS_COLLECTION)
    .where("status", "==", "pending")
    .get();

  let locked = 0;
  let available = 0;

  for (const doc of pendingSnapshot.docs) {
    const data = doc.data() as CommissionRecord;
    const refundWindowEndsAt = toDate(data.refundWindowEndsAt);
    if (!refundWindowEndsAt || refundWindowEndsAt.getTime() > now.getTime()) {
      continue;
    }

    await doc.ref.update({
      status: "available",
      lockedAt: FieldValue.serverTimestamp(),
      availableAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    locked += 1;
    available += 1;
  }

  return { locked, available };
}
