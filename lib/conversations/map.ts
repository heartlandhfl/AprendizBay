import type { Conversation, ConversationMessage } from "@/lib/conversations/types";

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function mapConversationDoc(
  id: string,
  data: Record<string, unknown>,
): Conversation {
  const studentId = String(data.studentId ?? "");
  const tutorId = String(data.tutorId ?? "");
  const rawParticipants = Array.isArray(data.participantIds)
    ? data.participantIds.filter((value): value is string => typeof value === "string")
    : [studentId, tutorId];

  return {
    id,
    studentId,
    tutorId,
    participantIds: [rawParticipants[0] ?? studentId, rawParticipants[1] ?? tutorId],
    studentName: asOptionalString(data.studentName),
    tutorName: asOptionalString(data.tutorName),
    lastMessage: asOptionalString(data.lastMessage),
    lastMessageAt: data.lastMessageAt as Conversation["lastMessageAt"],
    createdAt: data.createdAt as Conversation["createdAt"],
    updatedAt: data.updatedAt as Conversation["updatedAt"],
  };
}

export function mapMessageDoc(
  id: string,
  data: Record<string, unknown>,
): ConversationMessage {
  return {
    id,
    senderId: String(data.senderId ?? ""),
    text: String(data.text ?? ""),
    createdAt: data.createdAt as ConversationMessage["createdAt"],
  };
}
