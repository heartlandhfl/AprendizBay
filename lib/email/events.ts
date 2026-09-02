export const EMAIL_EVENTS = {
  USER_REGISTERED: "USER_REGISTERED",
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_ACCEPTED: "BOOKING_ACCEPTED",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  LESSON_REMINDER: "LESSON_REMINDER",
  LESSON_CANCELLED: "LESSON_CANCELLED",
  REFUND_COMPLETED: "REFUND_COMPLETED",
  LESSON_COMPLETED: "LESSON_COMPLETED",
  REVIEW_REQUEST: "REVIEW_REQUEST",
  NEW_MESSAGE: "NEW_MESSAGE",
} as const;

export type EmailEventName = (typeof EMAIL_EVENTS)[keyof typeof EMAIL_EVENTS];

export interface UserRegisteredPayload {
  userId: string;
}

export interface BookingEventPayload {
  bookingId: string;
}

export interface LessonReminderPayload {
  bookingId: string;
  recipientUserId: string;
}

export interface RefundCompletedPayload {
  bookingId: string;
  refundAmount?: number;
}

export interface ReviewRequestPayload {
  bookingId: string;
}

export interface NewMessagePayload {
  conversationId: string;
  messageId: string;
  recipientUserId: string;
}

export type EmailEventPayloadMap = {
  USER_REGISTERED: UserRegisteredPayload;
  BOOKING_CREATED: BookingEventPayload;
  BOOKING_ACCEPTED: BookingEventPayload;
  PAYMENT_CONFIRMED: BookingEventPayload;
  PAYMENT_FAILED: BookingEventPayload;
  LESSON_REMINDER: LessonReminderPayload;
  LESSON_CANCELLED: BookingEventPayload;
  REFUND_COMPLETED: RefundCompletedPayload;
  LESSON_COMPLETED: BookingEventPayload;
  REVIEW_REQUEST: ReviewRequestPayload;
  NEW_MESSAGE: NewMessagePayload;
};

export type EmailEventPayload<T extends EmailEventName = EmailEventName> =
  EmailEventPayloadMap[T];
