export const EMAIL_OUTBOX_COLLECTION = "emailOutbox" as const;

export const MAX_OUTBOX_ATTEMPTS = 5;

export const OUTBOX_RETRY_DELAYS_MS = [
  60_000,
  300_000,
  900_000,
  3_600_000,
  21_600_000,
] as const;

export type EmailOutboxStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "permanent_failure";

export interface EmailOutboxCreateInput {
  eventName: string;
  eventKey: string;
  recipientUserId?: string;
  recipientEmail: string;
  bookingId?: string;
  conversationId?: string;
  messageId?: string;
  reviewId?: string;
  subject: string;
  templateName: string;
  text: string;
  html: string;
  from?: string;
}

export interface EmailOutboxRecord extends EmailOutboxCreateInput {
  status: EmailOutboxStatus;
  attempts: number;
  lastError?: string;
  provider?: string;
  providerMessageId?: string;
  createdAt: Date;
  sentAt?: Date;
  failedAt?: Date;
  nextRetryAt?: Date;
}

export type EnqueueEmailResult =
  | {
      kind: "created";
      emailId: string;
    }
  | {
      kind: "duplicate";
      emailId: string;
      status: EmailOutboxStatus;
    }
  | {
      kind: "already_sent";
      emailId: string;
    }
  | {
      kind: "permanent_failure";
      emailId: string;
    };

export interface DeliverOutboxResult {
  emailId: string;
  status: EmailOutboxStatus;
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  provider?: string;
}
