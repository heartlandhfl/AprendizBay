/**
 * Hostinger audit — firebase-admin (Next.js server modules only)
 *
 * Used by app/api/notifications and confirmBookingWithMeetingUrl. Express uses
 * server/api/notifications.js instead and must not require this file.
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { EMAIL_EVENTS } from "@/lib/email/events";
import { onEvent, onNewReviewEmail } from "@/lib/email/send";
import { getAdminApp } from "@/lib/firebase/admin";
import { isWithinLessonReminderWindow, toDate } from "@/lib/notifications/core";
import type { NotificationRequest } from "@/lib/notifications/types";

function requireDb() {
  return getFirestore(getAdminApp());
}

export async function notifyPendingBooking(bookingId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.BOOKING_CREATED, { bookingId });
}

export async function notifyConfirmedBooking(bookingId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.PAYMENT_CONFIRMED, { bookingId });
}

export async function notifyBookingAccepted(bookingId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.BOOKING_ACCEPTED, { bookingId });
}

export async function notifyPaymentFailed(bookingId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.PAYMENT_FAILED, { bookingId });
}

export async function notifyLessonCancelled(bookingId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.LESSON_CANCELLED, { bookingId });
}

export async function notifyRefundCompleted(
  bookingId: string,
  refundAmount?: number,
): Promise<void> {
  await onEvent(EMAIL_EVENTS.REFUND_COMPLETED, { bookingId, refundAmount });
}

export async function notifyLessonCompleted(bookingId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.LESSON_COMPLETED, { bookingId });
  await onEvent(EMAIL_EVENTS.REVIEW_REQUEST, { bookingId });
}

export async function notifyNewReview(reviewId: string): Promise<void> {
  await onNewReviewEmail(reviewId);
}

export async function notifyLessonReminders(now: Date = new Date()): Promise<{
  scanned: number;
  sent: number;
}> {
  const db = requireDb();
  const snapshot = await db.collection("bookings").where("status", "==", "confirmed").get();

  let sent = 0;

  for (const docSnap of snapshot.docs) {
    const booking = docSnap.data();
    if (booking.lessonReminderSentAt) {
      continue;
    }

    const scheduledAt = toDate(booking.scheduledAt);
    if (!isWithinLessonReminderWindow(scheduledAt, now)) {
      continue;
    }

    const studentId = String(booking.studentId ?? "");
    const tutorId = String(booking.tutorId ?? "");

    await onEvent(EMAIL_EVENTS.LESSON_REMINDER, {
      bookingId: docSnap.id,
      recipientUserId: studentId,
    });
    await onEvent(EMAIL_EVENTS.LESSON_REMINDER, {
      bookingId: docSnap.id,
      recipientUserId: tutorId,
    });

    await docSnap.ref.update({
      lessonReminderSentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    sent += 1;
  }

  return { scanned: snapshot.size, sent };
}

export async function dispatchNotification(
  request: NotificationRequest,
): Promise<{ ok: true; type: NotificationRequest["type"] }> {
  switch (request.type) {
    case "pending_booking":
      if (!request.bookingId) {
        throw new Error("Informe o identificador da reserva.");
      }
      await notifyPendingBooking(request.bookingId);
      return { ok: true, type: request.type };
    case "booking_accepted":
      if (!request.bookingId) {
        throw new Error("Informe o identificador da reserva.");
      }
      await notifyBookingAccepted(request.bookingId);
      return { ok: true, type: request.type };
    case "confirmed_booking":
      if (!request.bookingId) {
        throw new Error("Informe o identificador da reserva.");
      }
      await notifyConfirmedBooking(request.bookingId);
      return { ok: true, type: request.type };
    case "new_review":
      if (!request.reviewId) {
        throw new Error("Informe o identificador da avaliação.");
      }
      await notifyNewReview(request.reviewId);
      return { ok: true, type: request.type };
    case "lesson_reminder":
      await notifyLessonReminders();
      return { ok: true, type: request.type };
    case "lesson_cancelled":
      if (!request.bookingId) {
        throw new Error("Informe o identificador da reserva.");
      }
      await notifyLessonCancelled(request.bookingId);
      return { ok: true, type: request.type };
    case "refund_completed":
      if (!request.bookingId) {
        throw new Error("Informe o identificador da reserva.");
      }
      await notifyRefundCompleted(request.bookingId, request.refundAmount);
      return { ok: true, type: request.type };
    case "lesson_completed":
      if (!request.bookingId) {
        throw new Error("Informe o identificador da reserva.");
      }
      await notifyLessonCompleted(request.bookingId);
      return { ok: true, type: request.type };
    case "new_message":
      if (!request.conversationId || !request.messageId || !request.recipientUserId) {
        throw new Error("Informe a conversa, a mensagem e o destinatário.");
      }
      await onEvent(EMAIL_EVENTS.NEW_MESSAGE, {
        conversationId: request.conversationId,
        messageId: request.messageId,
        recipientUserId: request.recipientUserId,
      });
      return { ok: true, type: request.type };
    default:
      throw new Error("Tipo de notificação inválido.");
  }
}

export async function safeNotify(
  task: () => Promise<unknown>,
  context: string,
): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.error(`[Aprendiz Bay] Falha ao enviar e-mail (${context}):`, error);
  }
}
