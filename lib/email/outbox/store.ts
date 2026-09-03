import { FieldValue, type Firestore, type Timestamp } from "firebase-admin/firestore";
import { toOutboxDocumentId } from "@/lib/email/outbox/event-keys";
import {
  EMAIL_OUTBOX_COLLECTION,
  type EmailOutboxCreateInput,
  type EmailOutboxRecord,
  type EmailOutboxStatus,
  type EnqueueEmailResult,
} from "@/lib/email/outbox/types";

export interface EmailOutboxStore {
  enqueue(input: EmailOutboxCreateInput): Promise<EnqueueEmailResult>;
  claim(emailId: string, now?: Date): Promise<EmailOutboxRecord | null>;
  markSent(
    emailId: string,
    update: { provider?: string; providerMessageId?: string; sentAt?: Date },
  ): Promise<void>;
  markFailed(
    emailId: string,
    update: {
      attempts: number;
      lastError: string;
      failedAt?: Date;
      nextRetryAt?: Date;
      status: Extract<EmailOutboxStatus, "failed" | "permanent_failure">;
    },
  ): Promise<void>;
  releaseProcessing(emailId: string): Promise<void>;
  listDueForRetry(now?: Date): Promise<EmailOutboxRecord[]>;
  get(emailId: string): Promise<EmailOutboxRecord | null>;
}

function toDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  return undefined;
}

function mapRecord(emailId: string, data: Record<string, unknown>): EmailOutboxRecord {
  return {
    eventName: String(data.eventName ?? ""),
    eventKey: String(data.eventKey ?? emailId),
    recipientUserId:
      typeof data.recipientUserId === "string" ? data.recipientUserId : undefined,
    recipientEmail: String(data.recipientEmail ?? ""),
    bookingId: typeof data.bookingId === "string" ? data.bookingId : undefined,
    conversationId: typeof data.conversationId === "string" ? data.conversationId : undefined,
    messageId: typeof data.messageId === "string" ? data.messageId : undefined,
    reviewId: typeof data.reviewId === "string" ? data.reviewId : undefined,
    subject: String(data.subject ?? ""),
    templateName: String(data.templateName ?? ""),
    text: String(data.text ?? ""),
    html: String(data.html ?? ""),
    from: typeof data.from === "string" ? data.from : undefined,
    status: (data.status as EmailOutboxStatus) ?? "pending",
    attempts: typeof data.attempts === "number" ? data.attempts : 0,
    lastError: typeof data.lastError === "string" ? data.lastError : undefined,
    provider: typeof data.provider === "string" ? data.provider : undefined,
    providerMessageId:
      typeof data.providerMessageId === "string" ? data.providerMessageId : undefined,
    createdAt: toDate(data.createdAt) ?? new Date(0),
    sentAt: toDate(data.sentAt),
    failedAt: toDate(data.failedAt),
    nextRetryAt: toDate(data.nextRetryAt),
  };
}

function classifyExisting(status: EmailOutboxStatus): EnqueueEmailResult["kind"] {
  if (status === "sent") {
    return "already_sent";
  }
  if (status === "permanent_failure") {
    return "permanent_failure";
  }
  return "duplicate";
}

export function createFirestoreEmailOutboxStore(db: Firestore): EmailOutboxStore {
  const collection = db.collection(EMAIL_OUTBOX_COLLECTION);

  return {
    async enqueue(input) {
      const emailId = toOutboxDocumentId(input.eventKey);
      const ref = collection.doc(emailId);

      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (snapshot.exists) {
          const status = (snapshot.data()?.status as EmailOutboxStatus) ?? "pending";
          return {
            kind: classifyExisting(status),
            emailId,
            ...(status !== "sent" && status !== "permanent_failure" ? { status } : {}),
          } as EnqueueEmailResult;
        }

        transaction.set(ref, {
          ...input,
          status: "pending",
          attempts: 0,
          createdAt: FieldValue.serverTimestamp(),
        });

        return { kind: "created", emailId };
      });
    },

    async claim(emailId, now = new Date()) {
      const ref = collection.doc(emailId);

      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) {
          return null;
        }

        const record = mapRecord(emailId, (snapshot.data() ?? {}) as Record<string, unknown>);
        if (record.status === "sent" || record.status === "permanent_failure") {
          return null;
        }
        if (record.status === "processing") {
          return null;
        }
        if (
          record.status === "failed" &&
          record.nextRetryAt &&
          record.nextRetryAt.getTime() > now.getTime()
        ) {
          return null;
        }

        transaction.update(ref, {
          status: "processing",
          updatedAt: FieldValue.serverTimestamp(),
        });

        return { ...record, status: "processing" };
      });
    },

    async markSent(emailId, update) {
      await collection.doc(emailId).update({
        status: "sent",
        provider: update.provider ?? null,
        providerMessageId: update.providerMessageId ?? null,
        sentAt: update.sentAt ?? FieldValue.serverTimestamp(),
        lastError: FieldValue.delete(),
        nextRetryAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    },

    async markFailed(emailId, update) {
      await collection.doc(emailId).update({
        status: update.status,
        attempts: update.attempts,
        lastError: update.lastError,
        failedAt: update.failedAt ?? FieldValue.serverTimestamp(),
        nextRetryAt: update.nextRetryAt ?? FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    },

    async releaseProcessing(emailId) {
      await collection.doc(emailId).update({
        status: "pending",
        updatedAt: FieldValue.serverTimestamp(),
      });
    },

    async listDueForRetry(now = new Date()) {
      const pendingSnapshot = await collection.where("status", "==", "pending").limit(50).get();
      const failedSnapshot = await collection.where("status", "==", "failed").limit(50).get();

      const records = [...pendingSnapshot.docs, ...failedSnapshot.docs].map((docSnap) =>
        mapRecord(docSnap.id, (docSnap.data() ?? {}) as Record<string, unknown>),
      );

      return records.filter((record) => {
        if (record.status === "pending") {
          return true;
        }
        return record.nextRetryAt ? record.nextRetryAt.getTime() <= now.getTime() : true;
      });
    },

    async get(emailId) {
      const snapshot = await collection.doc(emailId).get();
      if (!snapshot.exists) {
        return null;
      }
      return mapRecord(emailId, (snapshot.data() ?? {}) as Record<string, unknown>);
    },
  };
}

export function createMemoryEmailOutboxStore(): EmailOutboxStore & {
  records: Map<string, EmailOutboxRecord>;
} {
  const records = new Map<string, EmailOutboxRecord>();
  const locks = new Map<string, Promise<unknown>>();

  async function withLock<T>(emailId: string, work: () => Promise<T>): Promise<T> {
    const previous = locks.get(emailId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    locks.set(
      emailId,
      previous.then(() => current),
    );
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }

  return {
    records,
    async enqueue(input) {
      const emailId = toOutboxDocumentId(input.eventKey);
      return withLock(emailId, async () => {
        const existing = records.get(emailId);
        if (existing) {
          return {
            kind: classifyExisting(existing.status),
            emailId,
            ...(existing.status !== "sent" && existing.status !== "permanent_failure"
              ? { status: existing.status }
              : {}),
          } as EnqueueEmailResult;
        }

        records.set(emailId, {
          ...input,
          status: "pending",
          attempts: 0,
          createdAt: new Date(),
        });
        return { kind: "created", emailId };
      });
    },

    async claim(emailId, now = new Date()) {
      return withLock(emailId, async () => {
        const record = records.get(emailId);
        if (!record) {
          return null;
        }
        if (record.status === "sent" || record.status === "permanent_failure") {
          return null;
        }
        if (record.status === "processing") {
          return null;
        }
        if (
          record.status === "failed" &&
          record.nextRetryAt &&
          record.nextRetryAt.getTime() > now.getTime()
        ) {
          return null;
        }

        const claimed = { ...record, status: "processing" as const };
        records.set(emailId, claimed);
        return claimed;
      });
    },

    async markSent(emailId, update) {
      await withLock(emailId, async () => {
        const record = records.get(emailId);
        if (!record) {
          return;
        }
        records.set(emailId, {
          ...record,
          status: "sent",
          provider: update.provider,
          providerMessageId: update.providerMessageId,
          sentAt: update.sentAt ?? new Date(),
          lastError: undefined,
          nextRetryAt: undefined,
        });
      });
    },

    async markFailed(emailId, update) {
      await withLock(emailId, async () => {
        const record = records.get(emailId);
        if (!record) {
          return;
        }
        records.set(emailId, {
          ...record,
          status: update.status,
          attempts: update.attempts,
          lastError: update.lastError,
          failedAt: update.failedAt ?? new Date(),
          nextRetryAt: update.nextRetryAt,
        });
      });
    },

    async releaseProcessing(emailId) {
      await withLock(emailId, async () => {
        const record = records.get(emailId);
        if (!record || record.status !== "processing") {
          return;
        }
        records.set(emailId, { ...record, status: "pending" });
      });
    },

    async listDueForRetry(now = new Date()) {
      return [...records.values()].filter((record) => {
        if (record.status === "pending") {
          return true;
        }
        if (record.status === "failed") {
          return record.nextRetryAt ? record.nextRetryAt.getTime() <= now.getTime() : true;
        }
        return false;
      });
    },

    async get(emailId) {
      return records.get(emailId) ?? null;
    },
  };
}
