export type NotificationEventType =
  | "user_registered"
  | "email_verification"
  | "pending_booking"
  | "booking_accepted"
  | "confirmed_booking"
  | "tutor_verification_submitted"
  | "lesson_reminder"
  | "lesson_cancelled"
  | "refund_completed"
  | "lesson_completed"
  | "new_review"
  | "new_message";

export interface NotificationRequest {
  type: NotificationEventType;
  userId?: string;
  verificationUrl?: string;
  tutorId?: string;
  bookingId?: string;
  reviewId?: string;
  refundAmount?: number;
  conversationId?: string;
  messageId?: string;
  recipientUserId?: string;
}
