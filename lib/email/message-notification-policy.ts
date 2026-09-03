/** Minimum time between message notification emails to the same recipient in a conversation. */
export const MESSAGE_EMAIL_COOLDOWN_MS = 15 * 60 * 1000;

export interface ConversationParticipants {
  studentId: string;
  tutorId: string;
  participantIds?: string[];
}

export function isConversationParticipant(
  conversation: ConversationParticipants,
  userId: string,
): boolean {
  if (!userId) {
    return false;
  }

  if (userId === conversation.studentId || userId === conversation.tutorId) {
    return true;
  }

  return conversation.participantIds?.includes(userId) ?? false;
}

function timestampToDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") {
      const date = toDate.call(value);
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }
  }

  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis;
    if (typeof toMillis === "function") {
      const date = new Date(toMillis.call(value));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

export function readLastMessageEmailSentAt(
  conversation: Record<string, unknown>,
  recipientUserId: string,
): Date | null {
  const perRecipient = conversation.lastMessageEmailSentAt;
  if (perRecipient && typeof perRecipient === "object" && !Array.isArray(perRecipient)) {
    return timestampToDate((perRecipient as Record<string, unknown>)[recipientUserId]);
  }

  return null;
}

export function shouldSendMessageEmail(
  lastSentAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (!lastSentAt) {
    return true;
  }

  return now.getTime() - lastSentAt.getTime() >= MESSAGE_EMAIL_COOLDOWN_MS;
}
