import { FieldValue, type Firestore } from "firebase-admin/firestore";
import {
  EMAIL_DELIVERY_EVENTS_COLLECTION,
  type EmailDeliveryEventRecord,
  type EmailDeliveryEventStore,
} from "@/lib/email/jetsend-webhook/process";

function toDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

export function createFirestoreEmailDeliveryEventStore(
  db: Firestore,
): EmailDeliveryEventStore {
  const collection = db.collection(EMAIL_DELIVERY_EVENTS_COLLECTION);

  return {
    async get(providerEventId) {
      const snapshot = await collection.doc(providerEventId).get();
      if (!snapshot.exists) {
        return null;
      }

      const data = snapshot.data() ?? {};
      return {
        providerEventId: String(data.providerEventId ?? providerEventId),
        providerMessageId: String(data.providerMessageId ?? ""),
        emailOutboxId:
          typeof data.emailOutboxId === "string" ? data.emailOutboxId : undefined,
        deliveryStatus: data.deliveryStatus as EmailDeliveryEventRecord["deliveryStatus"],
        occurredAt: toDate(data.occurredAt) ?? new Date(0),
        createdAt: toDate(data.createdAt) ?? new Date(0),
      };
    },

    async create(record) {
      const ref = collection.doc(record.providerEventId);

      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (snapshot.exists) {
          return false;
        }

        transaction.set(ref, {
          providerEventId: record.providerEventId,
          providerMessageId: record.providerMessageId,
          emailOutboxId: record.emailOutboxId ?? null,
          deliveryStatus: record.deliveryStatus,
          occurredAt: record.occurredAt,
          createdAt: FieldValue.serverTimestamp(),
        });

        return true;
      });
    },
  };
}
