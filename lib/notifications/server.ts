import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { EMAIL_EVENTS } from "@/lib/email/events";
import { onEvent, onNewReviewEmail } from "@/lib/email/send";
import { getActiveEmailProvider } from "@/lib/email/resend-sendgrid-provider";
import {
  createFirestoreEmailOutboxStore,
  processDueOutboxEmails,
} from "@/lib/email/outbox";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  isWithinLessonReminder24HourWindow,
  isWithinLessonReminderWindow,
  toDate,
} from "@/lib/notifications/core";
import type { NotificationRequest } from "@/lib/notifications/types";

function requireDb() {
  return getFirestore(getAdminApp());
}

export async function notifyUserRegistered(userId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.USER_REGISTERED, { userId });
  const db = requireDb();
  const userSnap = await db.collection("users").doc(userId).get();
  const role = userSnap.data()?.role;
  if (role === "tutor") {
    const tutorSnap = await db.collection("tutors").doc(userId).get();
    if (!tutorSnap.exists) {
      await onEvent(EMAIL_EVENTS.TUTOR_PROFILE_INCOMPLETE, { tutorId: userId });
    }
  }
}

export async function notifyEmailVerification(
  userId: string,
  verificationUrl?: string,
): Promise<void> {
  let resolvedUrl = verificationUrl?.trim();
  if (!resolvedUrl) {
    const auth = getAuth(getAdminApp());
    const user = await auth.getUser(userId);
    if (!user.email) {
      return;
    }
    resolvedUrl = await auth.generateEmailVerificationLink(user.email);
  }
  await onEvent(EMAIL_EVENTS.EMAIL_VERIFICATION, {
    userId,
    verificationUrl: resolvedUrl,
  });
}

export async function notifyPendingBooking(bookingId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.BOOKING_CREATED, { bookingId });
  await onEvent(EMAIL_EVENTS.BOOKING_REQUESTED, { bookingId });
}

export async function notifyConfirmedBooking(bookingId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.PAYMENT_CONFIRMED, { bookingId });
  await onEvent(EMAIL_EVENTS.LESSON_CONFIRMED, { bookingId });
  await onEvent(EMAIL_EVENTS.TUTOR_PAYMENT_RECEIVED, { bookingId });
}

export async function notifyBookingAccepted(bookingId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.BOOKING_ACCEPTED, { bookingId });
  const db = requireDb();
  const bookingSnap = await db.collection("bookings").doc(bookingId).get();
  const price = bookingSnap.data()?.price;
  if (typeof price === "number" && price > 0) {
    await onEvent(EMAIL_EVENTS.PAYMENT_REQUIRED, { bookingId });
  }
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

export async function notifyTutorVerificationSubmitted(tutorId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.TUTOR_VERIFICATION_SUBMITTED, { tutorId });
}

export async function notifyTutorVerificationApproved(tutorId: string): Promise<void> {
  await onEvent(EMAIL_EVENTS.TUTOR_VERIFICATION_APPROVED, { tutorId });
  await onEvent(EMAIL_EVENTS.TUTOR_PROFILE_PUBLISHED, { tutorId });
}

export async function processEmailOutboxRetries(now: Date = new Date()): Promise<{
  processed: number;
  sent: number;
}> {
  const db = requireDb();
  const results = await processDueOutboxEmails({
    store: createFirestoreEmailOutboxStore(db),
    provider: getActiveEmailProvider(),
    now: () => now,
  });

  return {
    processed: results.length,
    sent: results.filter((result) => result.sent && result.status === "sent").length,
  };
}

export async function notifyLessonReminders(now: Date = new Date()): Promise<{
  scanned: number;
  sent24h: number;
  sent1h: number;
  outboxProcessed: number;
  outboxSent: number;
}> {
  const db = requireDb();
  const snapshot = await db.collection("bookings").where("status", "==", "confirmed").get();

  let sent24h = 0;
  let sent1h = 0;

  for (const docSnap of snapshot.docs) {
    const booking = docSnap.data();
    const scheduledAt = toDate(booking.scheduledAt);
    const studentId = String(booking.studentId ?? "");
    const tutorId = String(booking.tutorId ?? "");

    if (!booking.lessonReminder24SentAt && isWithinLessonReminder24HourWindow(scheduledAt, now)) {
      await onEvent(EMAIL_EVENTS.LESSON_REMINDER, {
        bookingId: docSnap.id,
        recipientUserId: studentId,
        reminderType: "twenty_four_hour",
      });
      await onEvent(EMAIL_EVENTS.LESSON_REMINDER, {
        bookingId: docSnap.id,
        recipientUserId: tutorId,
        reminderType: "twenty_four_hour",
      });
      await docSnap.ref.update({
        lessonReminder24SentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      sent24h += 1;
      continue;
    }

    if (!booking.lessonReminderSentAt && isWithinLessonReminderWindow(scheduledAt, now)) {
      await onEvent(EMAIL_EVENTS.LESSON_REMINDER, {
        bookingId: docSnap.id,
        recipientUserId: studentId,
        reminderType: "one_hour",
      });
      await onEvent(EMAIL_EVENTS.LESSON_REMINDER, {
        bookingId: docSnap.id,
        recipientUserId: tutorId,
        reminderType: "one_hour",
      });
      await docSnap.ref.update({
        lessonReminderSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      sent1h += 1;
    }
  }

  const outboxRetry = await processEmailOutboxRetries(now);

  return {
    scanned: snapshot.size,
    sent: sent24h + sent1h,
    sent24h,
    sent1h,
    outboxProcessed: outboxRetry.processed,
    outboxSent: outboxRetry.sent,
  };
}

export async function dispatchNotification(
  request: NotificationRequest,
): Promise<{ ok: true; type: NotificationRequest["type"] }> {
  switch (request.type) {
    case "user_registered":
      if (!request.userId) {
        throw new Error("Informe o identificador do usuário.");
      }
      await notifyUserRegistered(request.userId);
      return { ok: true, type: request.type };
    case "email_verification":
      if (!request.userId) {
        throw new Error("Informe o identificador do usuário.");
      }
      await notifyEmailVerification(request.userId, request.verificationUrl);
      return { ok: true, type: request.type };
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
    case "tutor_verification_submitted":
      if (!request.tutorId) {
        throw new Error("Informe o identificador do professor.");
      }
      await notifyTutorVerificationSubmitted(request.tutorId);
      return { ok: true, type: request.type };
    case "new_review":
      if (!request.reviewId) {
        throw new Error("Informe o identificador da avaliação.");
      }
      await notifyNewReview(request.reviewId);
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
