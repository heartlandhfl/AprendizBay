import type { Timestamp } from "firebase/firestore";

export const MAX_MESSAGE_LENGTH = 2000;

export interface Conversation {
  id: string;
  studentId: string;
  tutorId: string;
  participantIds: [string, string];
  studentName?: string;
  tutorName?: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
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
