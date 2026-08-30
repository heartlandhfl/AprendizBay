"use strict";

const express = require("express");
const { Router } = require("express");
const {
  getAdminFirestore,
  readBearerToken,
  verifyIdToken,
} = require("./firebase-admin");
const {
  buildConfirmedBookingEmail,
  buildLessonReminderEmail,
  buildNewReviewEmail,
  buildPendingBookingEmail,
  getSiteUrl,
  isWithinLessonReminderWindow,
  sendEmail,
  toDate,
} = require("../../lib/notifications/core");

async function loadUser(db, uid) {
  const snapshot = await db.collection("users").doc(uid).get();
  const data = snapshot.data() ?? {};
  return {
    name:
      (typeof data.displayName === "string" && data.displayName.trim()) || "Usuário",
    email: typeof data.email === "string" ? data.email : undefined,
  };
}

async function loadTutor(db, tutorId) {
  const snapshot = await db.collection("tutors").doc(tutorId).get();
  const data = snapshot.data() ?? {};
  const ownerId =
    typeof data.userId === "string" && data.userId.trim() ? data.userId : tutorId;
  const owner = await loadUser(db, ownerId);
  return {
    name: (typeof data.name === "string" && data.name.trim()) || owner.name || "Professor",
    email: owner.email,
  };
}

async function notifyPendingBooking(db, bookingId) {
  const snapshot = await db.collection("bookings").doc(bookingId).get();
  if (!snapshot.exists) {
    return;
  }

  const booking = snapshot.data() ?? {};
  const student = await loadUser(db, String(booking.studentId ?? ""));
  const tutor = await loadTutor(db, String(booking.tutorId ?? ""));
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

async function notifyConfirmedBooking(db, bookingId) {
  const snapshot = await db.collection("bookings").doc(bookingId).get();
  if (!snapshot.exists) {
    return;
  }

  const booking = snapshot.data() ?? {};
  const student = await loadUser(db, String(booking.studentId ?? ""));
  const tutor = await loadTutor(db, String(booking.tutorId ?? ""));
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

async function notifyNewReview(db, reviewId) {
  const snapshot = await db.collection("reviews").doc(reviewId).get();
  if (!snapshot.exists) {
    return;
  }

  const review = snapshot.data() ?? {};
  const student = await loadUser(db, String(review.studentId ?? ""));
  const tutor = await loadTutor(db, String(review.tutorId ?? ""));
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

async function notifyLessonReminders(db, now = new Date()) {
  const snapshot = await db.collection("bookings").where("status", "==", "confirmed").get();
  const { FieldValue } = require("firebase-admin/firestore");
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

    const student = await loadUser(db, String(booking.studentId ?? ""));
    const tutor = await loadTutor(db, String(booking.tutorId ?? ""));
    const payload = {
      studentName: student.name,
      tutorName: tutor.name,
      bookingType: String(booking.type ?? ""),
      scheduledAt,
      meetingUrl: typeof booking.meetingUrl === "string" ? booking.meetingUrl : undefined,
    };

    await sendEmail({
      to: student.email ?? "",
      ...buildLessonReminderEmail({ ...payload, recipientName: student.name }),
    });
    await sendEmail({
      to: tutor.email ?? "",
      ...buildLessonReminderEmail({ ...payload, recipientName: tutor.name }),
    });

    await docSnap.ref.update({
      lessonReminderSentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    sent += 1;
  }

  return { scanned: snapshot.size, sent };
}

async function dispatchNotification(db, body) {
  const type = body?.type;
  if (type === "pending_booking") {
    if (!body.bookingId) {
      throw new Error("Informe o identificador da reserva.");
    }
    await notifyPendingBooking(db, body.bookingId);
    return { ok: true, type };
  }
  if (type === "confirmed_booking") {
    if (!body.bookingId) {
      throw new Error("Informe o identificador da reserva.");
    }
    await notifyConfirmedBooking(db, body.bookingId);
    return { ok: true, type };
  }
  if (type === "new_review") {
    if (!body.reviewId) {
      throw new Error("Informe o identificador da avaliação.");
    }
    await notifyNewReview(db, body.reviewId);
    return { ok: true, type };
  }
  throw new Error("Tipo de notificação inválido.");
}

function isAuthorizedCron(req) {
  const secret = String(
    process.env.NOTIFICATIONS_CRON_SECRET || process.env.CRON_SECRET || "",
  ).trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return req.get("authorization") === `Bearer ${secret}`;
}

const notificationsRouter = Router();
notificationsRouter.use(express.json({ limit: "32kb" }));

notificationsRouter.post("/", async (req, res) => {
  try {
    await verifyIdToken(readBearerToken(req));
    const result = await dispatchNotification(getAdminFirestore(), req.body);
    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar o e-mail.";
    const status =
      message.includes("Token") ||
      message.includes("autenticação") ||
      message.includes("id-token") ||
      message.includes("Decoding Firebase ID token")
        ? 401
        : message.includes("Firebase Admin")
          ? 503
          : message.includes("Informe") || message.includes("inválido")
            ? 400
            : 500;
    res.status(status).json({ error: message });
  }
});

notificationsRouter.post("/reminders", async (req, res) => {
  if (!isAuthorizedCron(req)) {
    res.status(401).json({ error: "Cron não autorizado." });
    return;
  }

  try {
    const result = await notifyLessonReminders(getAdminFirestore());
    res.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar os lembretes.";
    const status = message.includes("Firebase Admin") ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

notificationsRouter.get("/reminders", async (req, res) => {
  if (!isAuthorizedCron(req)) {
    res.status(401).json({ error: "Cron não autorizado." });
    return;
  }

  try {
    const result = await notifyLessonReminders(getAdminFirestore());
    res.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar os lembretes.";
    const status = message.includes("Firebase Admin") ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

module.exports = {
  dispatchNotification,
  isAuthorizedCron,
  notificationsRouter,
  notifyConfirmedBooking,
  notifyLessonReminders,
  notifyNewReview,
  notifyPendingBooking,
};
