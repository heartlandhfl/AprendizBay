import type { Timestamp } from "firebase/firestore";

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_REPORT_DETAILS_LENGTH = 1000;
export const MESSAGE_COOLDOWN_MS = 3_000;
export const MESSAGE_RATE_WINDOW_MS = 60_000;
export const MESSAGE_RATE_MAX_PER_WINDOW = 12;
export const MESSAGE_RATE_TICKET_MS = 15_000;

export const CONVERSATION_REPORT_REASONS = [
  { id: "harassment", label: "Conteúdo ofensivo ou assédio" },
  { id: "spam", label: "Spam" },
  { id: "off_platform", label: "Pagamento ou contato fora da plataforma" },
  { id: "other", label: "Outro" },
] as const;

export type ConversationReportReason = (typeof CONVERSATION_REPORT_REASONS)[number]["id"];

export type OffPlatformSignal =
  | "phone"
  | "email"
  | "pix_key"
  | "payment_instruction"
  | "external_contact";

export interface Conversation {
  id: string;
  studentId: string;
  tutorId: string;
  participantIds: [string, string];
  studentName?: string;
  tutorName?: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastSenderId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt?: Timestamp;
}

export interface ConversationNames {
  studentName: string;
  tutorName: string;
}

export interface BlockState {
  blockedByMe: boolean;
  blockedMe: boolean;
}

export interface ConversationReportInput {
  conversationId: string;
  reporterId: string;
  reportedUserId: string;
  reason: ConversationReportReason;
  details?: string;
}
