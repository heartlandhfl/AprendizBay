/**
 * Hostinger audit — firebase-admin (Next.js server modules only)
 *
 * Used by app/api/notifications and confirmBookingWithMeetingUrl. Express uses
 * server/api/notifications.js instead and must not require this file.
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  buildConfirmedBookingEmail,
  buildLessonReminderEmail,
  buildNewReviewEmail,
  buildPendingBookingEmail,
  getSiteUrl,
  isWithinLessonReminderWindow,
  sendEmail,
  toDate,
} from "@/lib/notifications/core";
import type { NotificationRequest } from "@/lib/notifications/types";

interface Person {
  name: string;
  email?: string;
}

function requireDb() {
  return getFirestore(getAdminApp());
}

async function loadUser(uid: string): Promise<Person> {
  const snapshot = await requireDb().collection("users").doc(uid).get();
  const data = snapshot.data() ?? {};
  return {
    name:
      (typeof data.displayName === "string" && data.displayName.trim()) || "Usuário",
    email: typeof data.email === "string" ? data.email : undefined,
  };
}

async function loadTutor(tutorId: string): Promise<Person> {
  const snapshot = await requireDb().collection("tutors").doc(tutorId).get();
  const data = snapshot.data() ?? {};
  const ownerId = typeof data.userId === "string" && data.userId.trim() ? data.userId : tutorId;
  const owner = await loadUser(ownerId);
  return {
    name:
      (typeof data.name === "string" && data.name.trim()) ||
      owner.name ||
      "Professor",
    email: owner.email,
  };
}

export async function notifyPendingBooking(bookingId: string): Promise<void> {
  const snapshot = await requireDb().collection("bookings").doc(bookingId).get();
  if (!snapshot.exists) {
    return;
  }

  const booking = snapshot.data() ?? {};
  const student = await loadUser(String(booking.studentId ?? ""));
  const tutor = await loadTutor(String(booking.tutorId ?? ""));
  const siteUrl = getSiteUrl();
  const email = buildPendingBookingEmail({
    tutorName: tutor.name,
    studentName: student.name,
    bookingType: String(booking.type ?? ""),
    scheduledAt: toDate(booking.scheduledAt),
    dashboardUrl: siteUrl ? `${siteUrl}/tutor/dashboard` : undefined,
  });

  await sendEmail({ to: tutor.email ?? "", ...email });
}

export async function notifyConfirmedBooking(bookingId: string): Promise<void> {
  const snapshot = await requireDb().collection("bookings").doc(bookingId).get();
  if (!snapshot.exists) {
    return;
  }

  const booking = snapshot.data() ?? {};
  const student = await loadUser(String(booking.studentId ?? ""));
  const tutor = await loadTutor(String(booking.tutorId ?? ""));
  const siteUrl = getSiteUrl();
  const email = buildConfirmedBookingEmail({
    studentName: student.name,
    tutorName: tutor.name,
    bookingType: String(booking.type ?? ""),
    scheduledAt: toDate(booking.scheduledAt),
    meetingUrl: typeof booking.meetingUrl === "string" ? booking.meetingUrl : undefined,
    bookingsUrl: siteUrl ? `${siteUrl}/bookings` : undefined,
  });

  await sendEmail({ to: student.email ?? "", ...email });
}

export async function notifyNewReview(reviewId: string): Promise<void> {
  const snapshot = await requireDb().collection("reviews").doc(reviewId).get();
  if (!snapshot.exists) {
    return;
  }

  const review = snapshot.data() ?? {};
  const student = await loadUser(String(review.studentId ?? ""));
  const tutor = await loadTutor(String(review.tutorId ?? ""));
  const siteUrl = getSiteUrl();
  const email = buildNewReviewEmail({
    tutorName: tutor.name,
    studentName: student.name,
    rating: Number(review.rating ?? 0),
    comment: typeof review.comment === "string" ? review.comment : "",
    dashboardUrl: siteUrl ? `${siteUrl}/tutor/dashboard` : undefined,
  });

  await sendEmail({ to: tutor.email ?? "", ...email });
}

export async function notifyLessonReminders(now: Date = new Date()): Promise<{
  scanned: number;
  sent: number;
}> {
  const snapshot = await requireDb()
    .collection("bookings")
    .where("status", "==", "confirmed")
    .get();

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

    const student = await loadUser(String(booking.studentId ?? ""));
    const tutor = await loadTutor(String(booking.tutorId ?? ""));
    const payload = {
      studentName: student.name,
      tutorName: tutor.name,
      bookingType: String(booking.type ?? ""),
      scheduledAt,
      meetingUrl: typeof booking.meetingUrl === "string" ? booking.meetingUrl : undefined,
    };

    const studentEmail = buildLessonReminderEmail({
      ...payload,
      recipientName: student.name,
    });
    const tutorEmail = buildLessonReminderEmail({
      ...payload,
      recipientName: tutor.name,
    });

    await sendEmail({ to: student.email ?? "", ...studentEmail });
    await sendEmail({ to: tutor.email ?? "", ...tutorEmail });

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
