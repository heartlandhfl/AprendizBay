export const EMAIL_EVENTS = {
  USER_REGISTERED: "USER_REGISTERED",
  EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
  BOOKING_REQUESTED: "BOOKING_REQUESTED",
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_ACCEPTED: "BOOKING_ACCEPTED",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  LESSON_CONFIRMED: "LESSON_CONFIRMED",
  LESSON_REMINDER: "LESSON_REMINDER",
  LESSON_CANCELLED: "LESSON_CANCELLED",
  REFUND_COMPLETED: "REFUND_COMPLETED",
  LESSON_COMPLETED: "LESSON_COMPLETED",
  REVIEW_REQUEST: "REVIEW_REQUEST",
  NEW_MESSAGE: "NEW_MESSAGE",
  NEW_REVIEW: "NEW_REVIEW",
  TUTOR_PROFILE_INCOMPLETE: "TUTOR_PROFILE_INCOMPLETE",
  TUTOR_VERIFICATION_SUBMITTED: "TUTOR_VERIFICATION_SUBMITTED",
  TUTOR_VERIFICATION_APPROVED: "TUTOR_VERIFICATION_APPROVED",
  TUTOR_PROFILE_PUBLISHED: "TUTOR_PROFILE_PUBLISHED",
  TUTOR_PAYMENT_RECEIVED: "TUTOR_PAYMENT_RECEIVED",
} as const;

export type EmailEventName = (typeof EMAIL_EVENTS)[keyof typeof EMAIL_EVENTS];

export type LessonReminderType = "one_hour" | "twenty_four_hour";

export interface UserRegisteredPayload {
  userId: string;
}

export interface EmailVerificationPayload {
  userId: string;
  verificationUrl: string;
}

export interface BookingEventPayload {
  bookingId: string;
}

export interface LessonReminderPayload {
  bookingId: string;
  recipientUserId: string;
  reminderType?: LessonReminderType;
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

export interface NewReviewPayload {
  reviewId: string;
}

export interface TutorLifecyclePayload {
  tutorId: string;
}

export type EmailEventPayloadMap = {
  USER_REGISTERED: UserRegisteredPayload;
  EMAIL_VERIFICATION: EmailVerificationPayload;
  BOOKING_REQUESTED: BookingEventPayload;
  BOOKING_CREATED: BookingEventPayload;
  BOOKING_ACCEPTED: BookingEventPayload;
  PAYMENT_REQUIRED: BookingEventPayload;
  PAYMENT_CONFIRMED: BookingEventPayload;
  PAYMENT_FAILED: BookingEventPayload;
  LESSON_CONFIRMED: BookingEventPayload;
  LESSON_REMINDER: LessonReminderPayload;
  LESSON_CANCELLED: BookingEventPayload;
  REFUND_COMPLETED: RefundCompletedPayload;
  LESSON_COMPLETED: BookingEventPayload;
  REVIEW_REQUEST: ReviewRequestPayload;
  NEW_MESSAGE: NewMessagePayload;
  NEW_REVIEW: NewReviewPayload;
  TUTOR_PROFILE_INCOMPLETE: TutorLifecyclePayload;
  TUTOR_VERIFICATION_SUBMITTED: TutorLifecyclePayload;
  TUTOR_VERIFICATION_APPROVED: TutorLifecyclePayload;
  TUTOR_PROFILE_PUBLISHED: TutorLifecyclePayload;
  TUTOR_PAYMENT_RECEIVED: BookingEventPayload;
};

export type EmailEventPayload<T extends EmailEventName = EmailEventName> =
  EmailEventPayloadMap[T];
