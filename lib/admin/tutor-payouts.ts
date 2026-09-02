import { FieldValue, type Firestore } from "firebase-admin/firestore";
import {
  TUTOR_PAYOUTS_COLLECTION,
  type TutorPayoutRecord,
  type TutorPayoutStatus,
} from "@/lib/payments/ledger/schema";

export interface AdminTutorPayoutListItem {
  payoutId: string;
  tutorId: string;
  tutorName: string | null;
  bookingId: string;
  amount: number;
  status: TutorPayoutStatus;
  paymentIds: string[];
  createdAt: string | null;
  paidAt: string | null;
}

export const ADMIN_PAYOUT_ERRORS = {
  notFound: "Repasse não encontrado.",
  notPending: "Só é possível marcar repasses pendentes como pagos.",
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

async function resolveTutorName(db: Firestore, tutorId: string): Promise<string | null> {
  const snapshot = await db.collection("tutors").doc(tutorId).get();
  if (!snapshot.exists) {
    return null;
  }
  const name = snapshot.data()?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function mapPayoutRecord(
  docId: string,
  data: Record<string, unknown>,
  tutorName: string | null,
): AdminTutorPayoutListItem {
  const paymentIds = Array.isArray(data.paymentIds)
    ? data.paymentIds.filter((value): value is string => typeof value === "string")
    : [];

  return {
    payoutId: docId,
    tutorId: String(data.tutorId ?? ""),
    tutorName,
    bookingId: String(data.bookingId ?? ""),
    amount: typeof data.amount === "number" ? data.amount : 0,
    status: (data.status as TutorPayoutStatus) ?? "pending",
    paymentIds,
    createdAt: timestampToIso(data.createdAt),
    paidAt: timestampToIso(data.paidAt),
  };
}

export async function listAdminTutorPayouts(
  db: Firestore,
  status: TutorPayoutStatus = "pending",
): Promise<AdminTutorPayoutListItem[]> {
  const snapshot = await db
    .collection(TUTOR_PAYOUTS_COLLECTION)
    .where("status", "==", status)
    .get();

  const tutorNames = new Map<string, string | null>();
  const items: AdminTutorPayoutListItem[] = [];

  for (const doc of snapshot.docs) {
    const tutorId = String(doc.data().tutorId ?? "");
    if (!tutorNames.has(tutorId)) {
      tutorNames.set(tutorId, await resolveTutorName(db, tutorId));
    }
    items.push(mapPayoutRecord(doc.id, doc.data(), tutorNames.get(tutorId) ?? null));
  }

  return items.sort((left, right) => {
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightTime - leftTime;
  });
}

export async function markTutorPayoutPaid(
  db: Firestore,
  payoutId: string,
): Promise<AdminTutorPayoutListItem> {
  const ref = db.collection(TUTOR_PAYOUTS_COLLECTION).doc(payoutId);

  const updated = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new Error(ADMIN_PAYOUT_ERRORS.notFound);
    }

    const current = snapshot.data() as TutorPayoutRecord;
    if (current.status !== "pending") {
      throw new Error(ADMIN_PAYOUT_ERRORS.notPending);
    }

    transaction.update(ref, {
      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
    });

    return current;
  });

  const tutorName = await resolveTutorName(db, updated.tutorId);
  return mapPayoutRecord(
    payoutId,
    {
      ...updated,
      status: "paid",
      paidAt: new Date(),
    },
    tutorName,
  );
}
