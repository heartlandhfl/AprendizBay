export type ContactEmailDelivery = "sent" | "failed" | "skipped";

export type ContactInboxStatus = "unread" | "read" | "replied" | "archived";

export const CONTACT_INBOX_COLLECTION = "contactInbox";

export const CONTACT_INBOX_STATUS_OPTIONS: ContactInboxStatus[] = [
  "unread",
  "read",
  "replied",
  "archived",
];

export const CONTACT_EMAIL_DELIVERY_OPTIONS: ContactEmailDelivery[] = [
  "sent",
  "failed",
  "skipped",
];

export interface ContactInboxRecord {
  name: string;
  email: string;
  message: string;
  createdAt: Date;
  emailDelivery: ContactEmailDelivery;
  emailSkipReason?: string | null;
  status: ContactInboxStatus;
  assignedTo?: string | null;
  readAt?: Date | null;
  respondedAt?: Date | null;
}
