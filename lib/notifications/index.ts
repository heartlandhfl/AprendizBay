export {
  buildConfirmedBookingEmail,
  buildLessonReminderEmail,
  buildNewReviewEmail,
  buildPendingBookingEmail,
  sendEmail,
} from "@/lib/notifications/core";
export { requestNotification } from "@/lib/notifications/client";
export type { NotificationEventType, NotificationRequest } from "@/lib/notifications/types";
