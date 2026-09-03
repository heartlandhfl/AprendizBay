import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  EMAIL_EVENTS,
  type EmailEventName,
  type EmailEventPayloadMap,
} from "@/lib/email/events";
import type { EmailProvider, EmailResult } from "@/lib/email/provider";
import { getActiveEmailProvider } from "@/lib/email/resend-sendgrid-provider";
import {
  buildBookingParticipantEventKey,
  buildLessonReminderEventKey,
  buildNewMessageEventKey,
  buildNewReviewEventKey,
  buildUserRegisteredEventKey,
  createFirestoreEmailOutboxStore,
  enqueueAndDeliverTransactionalEmail,
  type EmailOutboxStore,
} from "@/lib/email/outbox";
import {
  buildEmailTemplate,
  buildNewReviewEmail,
  bookingTypeLabel,
  formatBookingAcceptedStatusLabel,
  formatDatePtBr,
  type EmailContent,
} from "@/lib/email/templates";
import { mapConversationDoc } from "@/lib/conversations/map";
import { conversationIdFor } from "@/lib/conversations/ids";
import {
  isConversationParticipant,
  readLastMessageEmailSentAt,
  shouldSendMessageEmail,
} from "@/lib/email/message-notification-policy";
import { getAdminApp } from "@/lib/firebase/admin";
import { lessonPath } from "@/lib/lessons/paths";
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
  /** Pass `false` to send directly without the outbox (unit tests). */
  outbox?: EmailOutboxStore | false;
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

interface TutorPerson extends Person {
  subjectLabel?: string;
}

function tutorSubjectLabel(data: Record<string, unknown>): string | undefined {
  const subjects = Array.isArray(data.subjects)
    ? data.subjects.filter((value): value is string => typeof value === "string" && value.trim())
    : [];
  if (subjects.length > 0) {
    return subjects[0]?.trim();
  }
  const subject = typeof data.subject === "string" ? data.subject.trim() : "";
  return subject || undefined;
}

async function loadTutor(db: Firestore, tutorId: string): Promise<TutorPerson> {
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
    subjectLabel: tutorSubjectLabel(data),
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

interface SendContentOutboxMeta {
  eventName: EmailEventName;
  eventKey: string;
  recipientUserId?: string;
  bookingId?: string;
  conversationId?: string;
  messageId?: string;
  reviewId?: string;
  templateName: string;
}

async function sendContent(
  db: Firestore,
  provider: EmailProvider,
  to: string | undefined,
  content: EmailContent,
  meta: SendContentOutboxMeta,
  deps: OnEmailEventDeps,
): Promise<EmailResult> {
  if (!to?.trim()) {
    return { sent: false, skipped: true, reason: "missing_recipient" };
  }

  if (deps.outbox === false) {
    return provider.send({ to, ...content });
  }

  const store = deps.outbox ?? createFirestoreEmailOutboxStore(db);

  return enqueueAndDeliverTransactionalEmail(
    {
      eventName: meta.eventName,
      eventKey: meta.eventKey,
      recipientUserId: meta.recipientUserId,
      recipientEmail: to.trim(),
      bookingId: meta.bookingId,
      conversationId: meta.conversationId,
      messageId: meta.messageId,
      reviewId: meta.reviewId,
      subject: content.subject,
      templateName: meta.templateName,
      text: content.text,
      html: content.html,
    },
    { store, provider },
  );
}

async function recordMessageEmailSent(
  db: Firestore,
  conversationId: string,
  recipientUserId: string,
): Promise<void> {
  await db.collection("conversations").doc(conversationId).update({
    [`lastMessageEmailSentAt.${recipientUserId}`]: FieldValue.serverTimestamp(),
  });
}

interface MessageBookingContext {
  lessonContextLabel: string;
  bookingUrl?: string;
}

async function resolveMessageBookingContext(
  db: Firestore,
  studentId: string,
  tutorId: string,
  tutorSubjectLabel: string | undefined,
  baseUrl: string,
): Promise<MessageBookingContext | null> {
  const snapshot = await db
    .collection("bookings")
    .where("studentId", "==", studentId)
    .where("tutorId", "==", tutorId)
    .get();

  const activeStatuses = new Set(["pending", "confirmed"]);
  let best: { id: string; data: Record<string, unknown> } | null = null;
  let bestTime = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const status = String(data.status ?? "");
    if (!activeStatuses.has(status)) {
      continue;
    }

    const scheduledAt = notificationCore.toDate(data.scheduledAt);
    const time = scheduledAt.getTime();
    if (!Number.isNaN(time) && time >= bestTime) {
      bestTime = time;
      best = { id: docSnap.id, data };
    }
  }

  if (!best) {
    return null;
  }

  const when = formatDatePtBr(notificationCore.toDate(best.data.scheduledAt));
  const typeLabel = bookingTypeLabel(String(best.data.type ?? ""));
  const subjectLine = tutorSubjectLabel?.trim() || "Aula";
  const lessonContextLabel = `${subjectLine} · ${typeLabel} · ${when}`;

  return {
    lessonContextLabel,
    bookingUrl: baseUrl ? `${baseUrl}${lessonPath(best.id)}` : undefined,
  };
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
    status: typeof data.status === "string" ? data.status : undefined,
    paymentStatus: typeof data.paymentStatus === "string" ? data.paymentStatus : undefined,
    subjectLabel: tutor.subjectLabel,
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
        db,
        provider,
        user.email,
        buildEmailTemplate(EMAIL_EVENTS.USER_REGISTERED, {
          displayName: user.name,
          roleLabel: roleLabel(role),
          bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
        }),
        {
          eventName: EMAIL_EVENTS.USER_REGISTERED,
          eventKey: buildUserRegisteredEventKey(eventPayload.userId),
          recipientUserId: eventPayload.userId,
          templateName: EMAIL_EVENTS.USER_REGISTERED,
        },
        deps,
      );
    }

    case EMAIL_EVENTS.BOOKING_CREATED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.BOOKING_CREATED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      return sendContent(
        db,
        provider,
        context.tutor.email,
        buildEmailTemplate(EMAIL_EVENTS.BOOKING_CREATED, {
          tutorName: context.tutor.name,
          studentName: context.student.name,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          dashboardUrl: baseUrl ? `${baseUrl}/tutor/dashboard` : undefined,
        }),
        {
          eventName: EMAIL_EVENTS.BOOKING_CREATED,
          eventKey: buildBookingParticipantEventKey(
            EMAIL_EVENTS.BOOKING_CREATED,
            eventPayload.bookingId,
            context.tutorId,
          ),
          recipientUserId: context.tutorId,
          bookingId: eventPayload.bookingId,
          templateName: EMAIL_EVENTS.BOOKING_CREATED,
        },
        deps,
      );
    }

    case EMAIL_EVENTS.BOOKING_ACCEPTED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.BOOKING_ACCEPTED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      const conversationId = conversationIdFor(context.studentId, context.tutorId);
      return sendContent(
        db,
        provider,
        context.student.email,
        buildEmailTemplate(EMAIL_EVENTS.BOOKING_ACCEPTED, {
          studentName: context.student.name,
          tutorName: context.tutor.name,
          subjectLabel: context.subjectLabel,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          statusLabel: formatBookingAcceptedStatusLabel(
            context.status,
            context.paymentStatus,
          ),
          priceLabel: context.price != null ? formatMoney(context.price) : undefined,
          bookingUrl: baseUrl
            ? `${baseUrl}${lessonPath(eventPayload.bookingId)}`
            : undefined,
          messagesUrl: baseUrl
            ? `${baseUrl}/mensagens/${encodeURIComponent(conversationId)}`
            : undefined,
          bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
        }),
        {
          eventName: EMAIL_EVENTS.BOOKING_ACCEPTED,
          eventKey: buildBookingParticipantEventKey(
            EMAIL_EVENTS.BOOKING_ACCEPTED,
            eventPayload.bookingId,
            context.studentId,
          ),
          recipientUserId: context.studentId,
          bookingId: eventPayload.bookingId,
          templateName: EMAIL_EVENTS.BOOKING_ACCEPTED,
        },
        deps,
      );
    }

    case EMAIL_EVENTS.PAYMENT_CONFIRMED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.PAYMENT_CONFIRMED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      return sendContent(
        db,
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
        {
          eventName: EMAIL_EVENTS.PAYMENT_CONFIRMED,
          eventKey: buildBookingParticipantEventKey(
            EMAIL_EVENTS.PAYMENT_CONFIRMED,
            eventPayload.bookingId,
            context.studentId,
          ),
          recipientUserId: context.studentId,
          bookingId: eventPayload.bookingId,
          templateName: EMAIL_EVENTS.PAYMENT_CONFIRMED,
        },
        deps,
      );
    }

    case EMAIL_EVENTS.PAYMENT_FAILED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.PAYMENT_FAILED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      return sendContent(
        db,
        provider,
        context.student.email,
        buildEmailTemplate(EMAIL_EVENTS.PAYMENT_FAILED, {
          studentName: context.student.name,
          tutorName: context.tutor.name,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
        }),
        {
          eventName: EMAIL_EVENTS.PAYMENT_FAILED,
          eventKey: buildBookingParticipantEventKey(
            EMAIL_EVENTS.PAYMENT_FAILED,
            eventPayload.bookingId,
            context.studentId,
          ),
          recipientUserId: context.studentId,
          bookingId: eventPayload.bookingId,
          templateName: EMAIL_EVENTS.PAYMENT_FAILED,
        },
        deps,
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
        db,
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
        {
          eventName: EMAIL_EVENTS.LESSON_REMINDER,
          eventKey: buildLessonReminderEventKey(
            eventPayload.bookingId,
            eventPayload.recipientUserId,
          ),
          recipientUserId: eventPayload.recipientUserId,
          bookingId: eventPayload.bookingId,
          templateName: EMAIL_EVENTS.LESSON_REMINDER,
        },
        deps,
      );
    }

    case EMAIL_EVENTS.LESSON_CANCELLED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.LESSON_CANCELLED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      const recipients = [
        { person: context.student, userId: context.studentId },
        { person: context.tutor, userId: context.tutorId },
      ];
      const results: EmailResult[] = [];
      for (const recipient of recipients) {
        results.push(
          await sendContent(
            db,
            provider,
            recipient.person.email,
            buildEmailTemplate(EMAIL_EVENTS.LESSON_CANCELLED, {
              recipientName: recipient.person.name,
              studentName: context.student.name,
              tutorName: context.tutor.name,
              bookingType: context.bookingType,
              scheduledAt: context.scheduledAt,
              cancelledByLabel: "um dos participantes",
              bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
            }),
            {
              eventName: EMAIL_EVENTS.LESSON_CANCELLED,
              eventKey: buildBookingParticipantEventKey(
                EMAIL_EVENTS.LESSON_CANCELLED,
                eventPayload.bookingId,
                recipient.userId,
              ),
              recipientUserId: recipient.userId,
              bookingId: eventPayload.bookingId,
              templateName: EMAIL_EVENTS.LESSON_CANCELLED,
            },
            deps,
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
        db,
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
        {
          eventName: EMAIL_EVENTS.REFUND_COMPLETED,
          eventKey: buildBookingParticipantEventKey(
            EMAIL_EVENTS.REFUND_COMPLETED,
            eventPayload.bookingId,
            context.studentId,
          ),
          recipientUserId: context.studentId,
          bookingId: eventPayload.bookingId,
          templateName: EMAIL_EVENTS.REFUND_COMPLETED,
        },
        deps,
      );
    }

    case EMAIL_EVENTS.LESSON_COMPLETED: {
      const eventPayload = payload as EmailEventPayloadMap[typeof EMAIL_EVENTS.LESSON_COMPLETED];
      const context = await resolveBookingContext(db, eventPayload.bookingId);
      if (!context) {
        return { sent: false, skipped: true, reason: "booking_not_found" };
      }
      const recipients = [
        { person: context.student, userId: context.studentId },
        { person: context.tutor, userId: context.tutorId },
      ];
      const results: EmailResult[] = [];
      for (const recipient of recipients) {
        results.push(
          await sendContent(
            db,
            provider,
            recipient.person.email,
            buildEmailTemplate(EMAIL_EVENTS.LESSON_COMPLETED, {
              recipientName: recipient.person.name,
              studentName: context.student.name,
              tutorName: context.tutor.name,
              bookingType: context.bookingType,
              scheduledAt: context.scheduledAt,
              bookingsUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
            }),
            {
              eventName: EMAIL_EVENTS.LESSON_COMPLETED,
              eventKey: buildBookingParticipantEventKey(
                EMAIL_EVENTS.LESSON_COMPLETED,
                eventPayload.bookingId,
                recipient.userId,
              ),
              recipientUserId: recipient.userId,
              bookingId: eventPayload.bookingId,
              templateName: EMAIL_EVENTS.LESSON_COMPLETED,
            },
            deps,
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
        db,
        provider,
        context.student.email,
        buildEmailTemplate(EMAIL_EVENTS.REVIEW_REQUEST, {
          studentName: context.student.name,
          tutorName: context.tutor.name,
          bookingType: context.bookingType,
          scheduledAt: context.scheduledAt,
          reviewUrl: baseUrl ? `${baseUrl}/bookings` : undefined,
        }),
        {
          eventName: EMAIL_EVENTS.REVIEW_REQUEST,
          eventKey: buildBookingParticipantEventKey(
            EMAIL_EVENTS.REVIEW_REQUEST,
            eventPayload.bookingId,
            context.studentId,
          ),
          recipientUserId: context.studentId,
          bookingId: eventPayload.bookingId,
          templateName: EMAIL_EVENTS.REVIEW_REQUEST,
        },
        deps,
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

      const conversation = mapConversationDoc(
        conversationSnap.id,
        conversationSnap.data() as Record<string, unknown>,
      );
      const conversationData = conversationSnap.data() ?? {};
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
      const recipientUserId = eventPayload.recipientUserId;

      if (!isConversationParticipant(conversation, recipientUserId)) {
        return { sent: false, skipped: true, reason: "unauthorized_recipient" };
      }

      if (senderId === recipientUserId) {
        return { sent: false, skipped: true, reason: "self_notification" };
      }

      if (!isConversationParticipant(conversation, senderId)) {
        return { sent: false, skipped: true, reason: "invalid_sender" };
      }

      const expectedRecipient =
        senderId === conversation.studentId ? conversation.tutorId : conversation.studentId;
      if (recipientUserId !== expectedRecipient) {
        return { sent: false, skipped: true, reason: "unauthorized_recipient" };
      }

      const lastSentAt = readLastMessageEmailSentAt(conversationData, recipientUserId);
      if (!shouldSendMessageEmail(lastSentAt)) {
        return { sent: false, skipped: true, reason: "recently_notified" };
      }

      const recipient =
        recipientUserId === conversation.tutorId
          ? await loadTutor(db, conversation.tutorId)
          : await loadUser(db, recipientUserId);
      const sender =
        senderId === conversation.tutorId
          ? await loadTutor(db, senderId)
          : await loadUser(db, senderId);
      const tutorProfile =
        senderId === conversation.tutorId
          ? (sender as TutorPerson)
          : await loadTutor(db, conversation.tutorId);
      const bookingContext = await resolveMessageBookingContext(
        db,
        conversation.studentId,
        conversation.tutorId,
        tutorProfile.subjectLabel,
        baseUrl,
      );
      const messagesUrl = baseUrl
        ? `${baseUrl}/mensagens/${encodeURIComponent(eventPayload.conversationId)}`
        : undefined;

      const result = await sendContent(
        db,
        provider,
        recipient.email,
        buildEmailTemplate(EMAIL_EVENTS.NEW_MESSAGE, {
          recipientName: recipient.name,
          senderName: sender.name,
          preview: typeof message.text === "string" ? message.text : "",
          lessonContextLabel: bookingContext?.lessonContextLabel,
          messagesUrl,
        }),
        {
          eventName: EMAIL_EVENTS.NEW_MESSAGE,
          eventKey: buildNewMessageEventKey(
            eventPayload.messageId,
            eventPayload.recipientUserId,
          ),
          recipientUserId: eventPayload.recipientUserId,
          conversationId: eventPayload.conversationId,
          messageId: eventPayload.messageId,
          templateName: EMAIL_EVENTS.NEW_MESSAGE,
        },
        deps,
      );

      if (result.sent && !result.skipped) {
        await recordMessageEmailSent(db, eventPayload.conversationId, recipientUserId);
      }

      return result;
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

  const tutorId = String(review.tutorId ?? "");

  return sendContent(
    db,
    provider,
    tutor.email,
    buildNewReviewEmail({
      tutorName: tutor.name,
      studentName: student.name,
      rating: Number(review.rating ?? 0),
      comment: typeof review.comment === "string" ? review.comment : "",
      dashboardUrl: baseUrl ? `${baseUrl}/tutor/dashboard` : undefined,
    }),
    {
      eventName: "NEW_REVIEW",
      eventKey: buildNewReviewEventKey(reviewId, tutorId),
      recipientUserId: tutorId,
      reviewId,
      templateName: "NEW_REVIEW",
    },
    deps,
  );
}

export type { EmailEventPayloadMap };
