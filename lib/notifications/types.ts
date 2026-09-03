export type NotificationEventType =
  | "user_registered"
  | "email_verification"
  | "pending_booking"
  | "booking_accepted"
  | "tutor_verification_submitted"
  | "new_review"
  | "new_message";

export interface NotificationRequest {
  type: NotificationEventType;
  userId?: string;
  verificationUrl?: string;
  tutorId?: string;
  bookingId?: string;
  reviewId?: string;
  conversationId?: string;
  messageId?: string;
  recipientUserId?: string;
}
