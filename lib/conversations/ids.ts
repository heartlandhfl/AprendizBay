export function conversationIdFor(studentId: string, tutorId: string): string {
  return `${studentId}_${tutorId}`;
}

export function otherParticipantId(
  conversation: { studentId: string; tutorId: string },
  currentUserId: string,
): string {
  return currentUserId === conversation.tutorId ? conversation.studentId : conversation.tutorId;
}

export function userBlockId(blockerId: string, blockedId: string): string {
  return `${blockerId}_${blockedId}`;
}

export function conversationReportId(conversationId: string, reporterId: string): string {
  return `${conversationId}_${reporterId}`;
}

export function otherParticipantName(
  conversation: {
    studentId: string;
    tutorId: string;
    studentName?: string;
    tutorName?: string;
  },
  currentUserId: string,
): string {
  if (currentUserId === conversation.tutorId) {
    return conversation.studentName?.trim() || "Aluno";
  }

  return conversation.tutorName?.trim() || "Professor";
}

export function previewMessage(text: string, maxLength = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
