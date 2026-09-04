import type { Firestore } from "firebase-admin/firestore";
import {
  TUTOR_PAYOUTS_COLLECTION,
  type TutorPayoutStatus,
} from "@/lib/payments/ledger/schema";

export interface TutorEarningsSummary {
  paidTotal: number;
  pendingTotal: number;
  processingTotal: number;
  paidCount: number;
  pendingCount: number;
  processingCount: number;
}

export interface TutorPayoutSnapshot {
  amount?: unknown;
  status?: unknown;
  tutorId?: unknown;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function readAmount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? roundMoney(value)
    : 0;
}

function readStatus(value: unknown): TutorPayoutStatus | null {
  if (
    value === "pending" ||
    value === "processing" ||
    value === "paid" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return value;
  }
  return null;
}

export function emptyTutorEarningsSummary(): TutorEarningsSummary {
  return {
    paidTotal: 0,
    pendingTotal: 0,
    processingTotal: 0,
    paidCount: 0,
    pendingCount: 0,
    processingCount: 0,
  };
}

/**
 * Authoritative payout rollup. Failed/cancelled rows are ignored so the
 * dashboard never presents a fabricated "balance".
 */
export function summarizeTutorPayouts(
  records: TutorPayoutSnapshot[],
): TutorEarningsSummary {
  const summary = emptyTutorEarningsSummary();

  for (const record of records) {
    const status = readStatus(record.status);
    const amount = readAmount(record.amount);

    if (status === "paid") {
      summary.paidTotal = roundMoney(summary.paidTotal + amount);
      summary.paidCount += 1;
    } else if (status === "pending") {
      summary.pendingTotal = roundMoney(summary.pendingTotal + amount);
      summary.pendingCount += 1;
    } else if (status === "processing") {
      summary.processingTotal = roundMoney(summary.processingTotal + amount);
      summary.processingCount += 1;
    }
  }

  return summary;
}

export async function getTutorEarningsSummary(
  db: Firestore,
  tutorId: string,
): Promise<TutorEarningsSummary> {
  const ownerId = tutorId.trim();
  if (!ownerId) {
    return emptyTutorEarningsSummary();
  }

  const snapshot = await db
    .collection(TUTOR_PAYOUTS_COLLECTION)
    .where("tutorId", "==", ownerId)
    .get();

  return summarizeTutorPayouts(
    snapshot.docs.map((doc) => doc.data() as TutorPayoutSnapshot),
  );
}

export function formatEarningsAmount(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
