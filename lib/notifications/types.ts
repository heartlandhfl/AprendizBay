export type NotificationEventType =
  | "pending_booking"
  | "confirmed_booking"
  | "lesson_reminder"
  | "new_review";

export interface NotificationRequest {
  type: NotificationEventType;
  bookingId?: string;
  reviewId?: string;
}
