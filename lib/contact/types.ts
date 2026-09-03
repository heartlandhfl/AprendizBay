export type ContactEmailDelivery = "sent" | "failed" | "skipped";

export type ContactInboxStatus = "unread" | "read" | "replied" | "archived";

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
