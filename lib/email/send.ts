import { getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  EMAIL_EVENTS,
  type EmailEventName,
  type EmailEventPayloadMap,
} from "@/lib/email/events";
import type { EmailProvider, EmailResult } from "@/lib/email/provider";
import { getActiveEmailProvider } from "@/lib/email/resend-sendgrid-provider";
import {
  buildEmailTemplate,
  buildNewReviewEmail,
  type EmailContent,
} from "@/lib/email/templates";
import { getAdminApp } from "@/lib/firebase/admin";
import { getSiteOrigin } from "@/lib/seo/site-url";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const notificationCore = require("../notifications/core.js") as {
  toDate(value: unknown): Date;
  getSiteUrl?(): string;
};

interface Person {
  name: string;
  email?: string;
}

export interface OnEmailEventDeps {
  db?: Firestore;
  provider?: EmailProvider;
}

function requireDb(deps: OnEmailEventDeps = {}): Firestore {
  return deps.db ?? getFirestore(getAdminApp());
}

function siteUrl(): string {
  const origin = getSiteOrigin().replace(/\/$/, "");
  if (origin) {
    return origin;
  }
  return notificationCore.getSiteUrl?.() ?? "";
}

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function roleLabel(role: string | undefined): string {
  if (role === "tutor") {
    return "professor";
  }
  if (role === "admin") {
    return "administrador";
  }
  return "aluno";
}

async function loadUser(db: Firestore, uid: string): Promise<Person> {
  const snapshot = await db.collection("users").doc(uid).get();
  const data = snapshot.data() ?? {};
  return {
    name:
      (typeof data.displayName === "string" && data.displayName.trim()) || "Usuário",
    email: typeof data.email === "string" ? data.email : undefined,
  };
}

async function loadTutor(db: Firestore, tutorId: string): Promise<Person> {
  const snapshot = await db.collection("tutors").doc(tutorId).get();
  const data = snapshot.data() ?? {};
  const ownerId = typeof data.userId === "string" && data.userId.trim() ? data.userId : tutorId;
  const owner = await loadUser(db, ownerId);
  return {
    name:
      (typeof data.name === "string" && data.name.trim()) ||
      owner.name ||
      "Professor",
    email: owner.email,
  };
}

async function loadBooking(db: Firestore, bookingId: string) {
  const snapshot = await db.collection("bookings").doc(bookingId).get();
  if (!snapshot.exists) {
    return null;
  }
  return {
    id: snapshot.id,
    data: snapshot.data() ?? {},
  };
}

async function sendContent(
  provider: EmailProvider,
  to: string | undefined,
  content: EmailContent,
): Promise<EmailResult> {
  if (!to?.trim()) {
    return { sent: false, skipped: true, reason: "missing_recipient" };
  }
  return provider.send({ to, ...content });
}

async function resolveBookingContext(db: Firestore, bookingId: string) {
  const booking = await loadBooking(db, bookingId);
  if (!booking) {
    return null;
  }

  const data = booking.data;
  const student = await loadUser(db, String(data.studentId ?? ""));
  const tutor = await loadTutor(db, String(data.tutorId ?? ""));
  const scheduledAt = notificationCore.toDate(data.scheduledAt);
  const price = typeof data.price === "number" ? data.price : undefined;

  return {
    bookingId,
    student,
    tutor,
    bookingType: String(data.type ?? ""),
    scheduledAt,
    meetingUrl: typeof data.meetingUrl === "string" ? data.meetingUrl : undefined,
    price,
    studentId: String(data.studentId ?? ""),
    tutorId: String(data.tutorId ?? ""),
  };
}

export async function onEvent(
  eventName: EmailEventName,
  payload: EmailEventPayloadMap[EmailEventName],
  deps: OnEmailEventDeps = {},
): Promise<EmailResult | EmailResult[]> {
  const db = requireDb(deps);
  const provider = deps.provider ?? getActiveEmailProvider();
  const baseUrl = siteUrl();

  switch (eventName) {
    case EMAIL_EVENTS.USER_REGISTERED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.USER_REGISTERED];
      const user = await loadUser(db, eventPayload.userId);
      const roleSnapshot = await db.collection("users").doc(eventPayload.userId).get();
      const role = typeof roleSnapshot.data()?.role === "string" ? roleSnapshot.data()?.role : undefined;
      return sendContent(
        provider,
        user.email,
        buildEmailTemplate(EMAIL_EVENTS.USER_REGISTERED, {
          displayName: user.name,
          roleLabel: roleLabel(role),
          bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
        }),
      );
    }

    case EMAIL_EVENTS.BOOKING_CREATED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.BOOKING_CREATED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      return sendContent(
        provider,
        context.tutor.email,
        buildEmailTemplate(EMAIL_EVENTS.BOOKING_CREATED, {
          tutorName: context.tutor.name,
          studentName: context.student.name,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          dashboardUrl: baseUrl ? `${baseUrl}/tutor/dashboard` : undefined,
        }),
      );
    }

    case EMAIL_EVENTS.BOOKING_ACCEPTED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.BOOKING_ACCEPTED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      return sendContent(
        provider,
        context.student.email,
        buildEmailTemplate(EMAIL_EVENTS.BOOKING_ACCEPTED, {
          studentName: context.student.name,
          tutorName: context.tutor.name,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          priceLabel: context.price != null ? formatMoney(context.price) : undefined,
          bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
        }),
      );
    }

    case EMAIL_EVENTS.PAYMENT_CONFIRMED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.PAYMENT_CONFIRMED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      return sendContent(
        provider,
        context.student.email,
        buildEmailTemplate(EMAIL_EVENTS.PAYMENT_CONFIRMED, {
          studentName: context.student.name,
          tutorName: context.tutor.name,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          meetingUrl: context.meetingUrl,
          bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
        }),
      );
    }

    case EMAIL_EVENTS.PAYMENT_FAILED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.PAYMENT_FAILED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      return sendContent(
        provider,
        context.student.email,
        buildEmailTemplate(EMAIL_EVENTS.PAYMENT_FAILED, {
          studentName: context.student.name,
          tutorName: context.tutor.name,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
        }),
      );
    }

    case EMAIL_EVENTS.LESSON_REMINDER: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.LESSON_REMINDER];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      const recipient =
        eventPayload.recipientUserId === context.tutorId ? context.tutor : context.student;
      return sendContent(
        provider,
        recipient.email,
        buildEmailTemplate(EMAIL_EVENTS.LESSON_REMINDER, {
          recipientName: recipient.name,
          studentName: context.student.name,
          tutorName: context.tutor.name,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          meetingUrl: context.meetingUrl,
        }),
      );
    }

    case EMAIL_EVENTS.LESSON_CANCELLED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.LESSON_CANCELLED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      const recipients = [context.student, context.tutor];
      const results: EmailResult[] = [];
      for (const recipient of recipients) {
        results.push(
          await sendContent(
            provider,
            recipient.email,
            buildEmailTemplate(EMAIL_EVENTS.LESSON_CANCELLED, {
              recipientName: recipient.name,
              studentName: context.student.name,
              tutorName: context.tutor.name,
              bookingType: context.bookingType,
              scheduledAt: context.scheduledAt,
              cancelledByLabel: "um dos participantes",
              bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
            }),
          ),
        );
      }
      return results;
    }

    case EMAIL_EVENTS.REFUND_COMPLETED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.REFUND_COMPLETED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      return sendContent(
        provider,
        context.student.email,
        buildEmailTemplate(EMAIL_EVENTS.REFUND_COMPLETED, {
          studentName: context.student.name,
          tutorName: context.tutor.name,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          refundAmountLabel:
            eventPayload.refundAmount != null ? formatMoney(eventPayload.refundAmount) : undefined,
          bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
        }),
      );
    }

    case EMAIL_EVENTS.LESSON_COMPLETED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.LESSON_COMPLETED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      const recipients = [context.student, context.tutor];
      const results: EmailResult[] = [];
      for (const recipient of recipients) {
        results.push(
          await sendContent(
            provider,
            recipient.email,
            buildEmailTemplate(EMAIL_EVENTS.LESSON_COMPLETED, {
              recipientName: recipient.name,
              studentName: context.student.name,
              tutorName: context.tutor.name,
              bookingType: context.bookingType,
              scheduledAt: context.scheduledAt,
              bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
            }),
          ),
        );
      }
      return results;
    }

    case EMAIL_EVENTS.REVIEW_REQUEST: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.REVIEW_REQUEST];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      return sendContent(
        provider,
        context.student.email,
        buildEmailTemplate(EMAIL_EVENTS.REVIEW_REQUEST, {
          studentName: context.student.name,
          tutorName: context.tutor.name,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          reviewUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
        }),
      );
    }

    case EMAIL_EVENTS.NEW_MESSAGE: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.NEW_MESSAGE];
      const conversationSnap = await db
        .collection("conversations")
        .doc(eventPayload.conversationId)
        .get();
      if (!conversationSnap.exists) {
        return { sent: false, skipped: true, reason: "conversation_not_found" };
      }
      const conversation = conversationSnap.data() ?? {};
      const messageSnap = await db
        .collection("conversations")
        .doc(eventPayload.conversationId)
        .collection("messages")
        .doc(eventPayload.messageId)
        .get();
      if (!messageSnap.exists) {
        return { sent: false, skipped: true, reason: "message_not_found" };
      }
      const message = messageSnap.data() ?? {};
      const senderId = String(message.senderId ?? "");
      const recipient =
        eventPayload.recipientUserId === String(conversation.tutorId ?? "")
          ? await loadTutor(db, String(conversation.tutorId ?? ""))
          : await loadUser(db, eventPayload.recipientUserId);
      const sender =
        senderId === String(conversation.tutorId ?? "")
          ? await loadTutor(db, senderId)
          : await loadUser(db, senderId);
      return sendContent(
        provider,
        recipient.email,
        buildEmailTemplate(EMAIL_EVENTS.NEW_MESSAGE, {
          recipientName: recipient.name,
          senderName: sender.name,
          preview: typeof message.text === "string" ? message.text : "",
          messagesUrl: baseUrl
            ? `${baseUrl}/mensagens/${encodeURIComponent(eventPayload.conversationId)}`
            : undefined,
        }),
      );
    }

    default: {
      const exhaustive: never = eventName;
      return { sent: false, skipped: true, reason: `unsupported_event:${exhaustive}` };
    }
  }
}

export async function onNewReviewEmail(
  reviewId: string,
  deps: OnEmailEventDeps = {},
): Promise<EmailResult> {
  const db = requireDb(deps);
  const provider = deps.provider ?? getActiveEmailProvider();
  const snapshot = await db.collection("reviews").doc(reviewId).get();
  if (!snapshot.exists) {
    return { sent: false, skipped: true, reason: "review_not_found" };
  }

  const review = snapshot.data() ?? {};
  const student = await loadUser(db, String(review.studentId ?? ""));
  const tutor = await loadTutor(db, String(review.tutorId ?? ""));
  const baseUrl = siteUrl();

  return sendContent(
    provider,
    tutor.email,
    buildNewReviewEmail({
      tutorName: tutor.name,
      studentName: student.name,
      rating: Number(review.rating ?? 0),
      comment: typeof review.comment === "string" ? review.comment : "",
      dashboardUrl: baseUrl ? `${baseUrl}/tutor/dashboard` : undefined,
    }),
  );
}

export type { EmailEventPayloadMap };
