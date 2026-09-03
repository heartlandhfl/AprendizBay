export function buildBookingParticipantEventKey(
  eventName: string,
  bookingId: string,
  participantId: string,
): string {
  return `${eventName}:${bookingId}:${participantId}`;
}

export function buildLessonReminderEventKey(
  bookingId: string,
  recipientUserId: string,
  reminderType = "one_hour",
): string {
  return `LESSON_REMINDER:${bookingId}:${recipientUserId}:${reminderType}`;
}

export function buildNewMessageEventKey(messageId: string, recipientUserId: string): string {
  return `NEW_MESSAGE:${messageId}:${recipientUserId}`;
}

export function buildUserRegisteredEventKey(userId: string): string {
  return `USER_REGISTERED:${userId}`;
}

export function buildNewReviewEventKey(reviewId: string, tutorId: string): string {
  return `NEW_REVIEW:${reviewId}:${tutorId}`;
}

export function toOutboxDocumentId(eventKey: string): string {
  return eventKey.replace(/\//g, "_").slice(0, 1500);
}
