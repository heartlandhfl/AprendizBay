export type NotificationEventType =
  | "pending_booking"
  | "booking_accepted"
  | "confirmed_booking"
  | "lesson_reminder"
  | "lesson_cancelled"
  | "refund_completed"
  | "lesson_completed"
  | "new_review"
  | "new_message";

export interface NotificationRequest {
  type: NotificationEventType;
  bookingId?: string;
  reviewId?: string;
  refundAmount?: number;
  conversationId?: string;
  messageId?: string;
  recipientUserId?: string;
}
