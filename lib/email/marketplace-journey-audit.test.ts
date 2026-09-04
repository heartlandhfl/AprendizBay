import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_EVENTS } from "@/lib/email/events";
import { TRANSACTIONAL_EMAIL_MATRIX } from "@/lib/email/event-catalog";
import { JetSendEmailError } from "@/lib/email/jetsend-provider";
import {
  createMemoryEmailDeliveryEventStore,
  processJetSendWebhookEvent,
} from "@/lib/email/jetsend-webhook/process";
import { WEBHOOK_ALREADY_PROCESSED_MESSAGE } from "@/lib/email/jetsend-webhook/messages";
import type { EmailProvider, EmailResult } from "@/lib/email/provider";
import {
  createMemoryEmailOutboxStore,
  deliverOutboxEmail,
  enqueueAndDeliverTransactionalEmail,
  processDueOutboxEmails,
} from "@/lib/email/outbox";
import { buildBookingParticipantEventKey } from "@/lib/email/outbox/event-keys";
import { onEvent, onNewReviewEmail } from "@/lib/email/send";
import { safeNotify } from "@/lib/notifications/server";

const BOOKING_ID = "booking-journey-1";
const STUDENT_ID = "student-1";
const TUTOR_ID = "tutor-1";
const TUTOR_OWNER_ID = "tutor-owner";
const CONVERSATION_ID = `${STUDENT_ID}_${TUTOR_ID}`;
const MESSAGE_ID = "msg-journey-1";
const REVIEW_ID = "review-journey-1";
const SCHEDULED_AT = new Date("2026-09-08T19:00:00.000Z");
const SITE_URL = "https://aprendizbay.com.br";

interface SentEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
  emailOutboxId?: string;
}

interface AuditRow {
  step: string;
  event: string;
  status: "PASS" | "FAIL";
  detail?: string;
}

const auditMatrix: AuditRow[] = [];

function recordAudit(step: string, event: string, passed: boolean, detail?: string) {
  auditMatrix.push({
    step,
    event,
    status: passed ? "PASS" : "FAIL",
    detail,
  });
}

function matrixRow(event: string) {
  return TRANSACTIONAL_EMAIL_MATRIX.find((row) => row.event === event);
}

function createSentEmailRecorder() {
  const emails: SentEmail[] = [];
  const send = vi.fn(async (input: SentEmail): Promise<EmailResult> => {
    emails.push({ ...input });
    return { sent: true, provider: "jetsend", providerMessageId: `msg-${emails.length}` };
  });
  const provider: EmailProvider & { send: typeof send } = { send };
  return { provider, emails, send };
}

function createMarketplaceDb(bookingOverrides: Record<string, unknown> = {}) {
  const users = new Map<string, Record<string, unknown>>([
    [STUDENT_ID, { displayName: "Ana Silva", email: "ana@example.com", role: "student" }],
    [TUTOR_OWNER_ID, { displayName: "João Tutor", email: "joao@example.com", role: "tutor" }],
  ]);
  const tutors = new Map<string, Record<string, unknown>>([
    [TUTOR_ID, { name: "Prof. João", userId: TUTOR_OWNER_ID, subject: "Inglês" }],
  ]);
  const bookings = new Map<string, Record<string, unknown>>([
    [
      BOOKING_ID,
      {
        studentId: STUDENT_ID,
        tutorId: TUTOR_ID,
        type: "individual",
        status: "pending",
        paymentStatus: "awaiting_payment",
        scheduledAt: SCHEDULED_AT,
        meetingUrl: "https://meet.example/lesson",
        price: 80,
        ...bookingOverrides,
      },
    ],
  ]);
  const conversations = new Map<string, Record<string, unknown>>([
    [
      CONVERSATION_ID,
      {
        studentId: STUDENT_ID,
        tutorId: TUTOR_ID,
        participantIds: [STUDENT_ID, TUTOR_ID],
        studentName: "Ana Silva",
        tutorName: "Prof. João",
      },
    ],
  ]);
  const messages = new Map<string, Record<string, unknown>>([
    [`${CONVERSATION_ID}/${MESSAGE_ID}`, { senderId: TUTOR_ID, text: "Olá! Podemos combinar a aula?" }],
  ]);
  const reviews = new Map<string, Record<string, unknown>>([
    [
      REVIEW_ID,
      {
        studentId: STUDENT_ID,
        tutorId: TUTOR_ID,
        rating: 5,
        comment: "Ótima aula, muito didático.",
      },
    ],
  ]);
  const updates: Array<{ path: string; data: Record<string, unknown> }> = [];

  return {
    updates,
    collection(name: string) {
      return {
        doc(id: string) {
          return {
            async get() {
              const data =
                name === "users"
                  ? users.get(id)
                  : name === "tutors"
                    ? tutors.get(id)
                    : name === "bookings"
                      ? bookings.get(id)
                      : name === "conversations"
                        ? conversations.get(id)
                        : name === "reviews"
                          ? reviews.get(id)
                          : undefined;
              return { exists: Boolean(data), id, data: () => data };
            },
            collection() {
              return {
                doc(messageId: string) {
                  return {
                    async get() {
                      const data = messages.get(`${id}/${messageId}`);
                      return { exists: Boolean(data), id: messageId, data: () => data };
                    },
                  };
                },
              };
            },
            async update(data: Record<string, unknown>) {
              updates.push({ path: `${name}/${id}`, data });
              const current =
                name === "conversations"
                  ? conversations.get(id)
                  : name === "bookings"
                    ? bookings.get(id)
                    : undefined;
              if (current) {
                if (name === "conversations") {
                  conversations.set(id, { ...current, ...data });
                } else if (name === "bookings") {
                  bookings.set(id, { ...current, ...data });
                }
              }
            },
          };
        },
        where(field: string, _op: string, value: string) {
          return {
            where(nextField: string, _nextOp: string, nextValue: string) {
              return {
                async get() {
                  const docs = [...bookings.entries()]
                    .filter(
                      ([, booking]) =>
                        booking[field] === value && booking[nextField] === nextValue,
                    )
                    .map(([bookingId, booking]) => ({
                      id: bookingId,
                      data: () => booking,
                    }));
                  return { docs };
                },
              };
            },
            async get() {
              const docs = [...bookings.entries()]
                .filter(([, booking]) => booking[field] === value)
                .map(([bookingId, booking]) => ({
                  id: bookingId,
                  data: () => booking,
                }));
              return { docs };
            },
          };
        },
      };
    },
  };
}

function assertEmailQuality(
  email: SentEmail,
  expectations: {
    to: string;
    subject: string | RegExp;
    names: string[];
    bookingHints?: string[];
    linkPaths?: string[];
    forbidden?: RegExp;
  },
) {
  expect(email.to).toBe(expectations.to);
  if (typeof expectations.subject === "string") {
    expect(email.subject).toBe(expectations.subject);
  } else {
    expect(email.subject).toMatch(expectations.subject);
  }
  for (const name of expectations.names) {
    expect(email.text).toContain(name);
    expect(email.html).toContain(name);
  }
  for (const hint of expectations.bookingHints ?? []) {
    expect(email.text).toContain(hint);
  }
  for (const path of expectations.linkPaths ?? []) {
    expect(email.text).toContain(path);
    expect(email.html).toContain(path);
  }
  expect(email.text.length).toBeGreaterThan(20);
  expect(email.html).toContain('lang="pt-BR"');
  expect(email.text).toContain("Aprendiz Bay");
  if (expectations.forbidden) {
    expect(email.text).not.toMatch(expectations.forbidden);
    expect(email.html).not.toMatch(expectations.forbidden);
  }
}

describe("marketplace transactional email journey audit", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    auditMatrix.length = 0;
    process.env = {
      ...originalEnv,
      EMAIL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: SITE_URL,
      JETSEND_FROM_EMAIL: "Aprendiz Bay <noreply@aprendizbay.com.br>",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("covers the full student → tutor → payment → lesson → review journey", async () => {
    const db = createMarketplaceDb();
    const { provider, emails } = createSentEmailRecorder();
    const deps = { db: db as never, provider, outbox: false as const };

    // 1. Register
    const register = await onEvent(EMAIL_EVENTS.USER_REGISTERED, { userId: STUDENT_ID }, deps);
    recordAudit("1. Register", EMAIL_EVENTS.USER_REGISTERED, register.sent === true);
    assertEmailQuality(emails.at(-1)!, {
      to: "ana@example.com",
      subject: matrixRow(EMAIL_EVENTS.USER_REGISTERED)!.subject,
      names: ["Ana"],
      linkPaths: ["/dashboard"],
      forbidden: /joao@example\.com|\+55/,
    });

    // 2. Verify email
    const verify = await onEvent(
      EMAIL_EVENTS.EMAIL_VERIFICATION,
      { userId: STUDENT_ID, verificationUrl: `${SITE_URL}/verify?token=abc` },
      deps,
    );
    recordAudit("2. Verify email", EMAIL_EVENTS.EMAIL_VERIFICATION, verify.sent === true);
    assertEmailQuality(emails.at(-1)!, {
      to: "ana@example.com",
      subject: matrixRow(EMAIL_EVENTS.EMAIL_VERIFICATION)!.subject,
      names: ["Ana"],
      linkPaths: ["/verify?token=abc"],
    });

    // 4. Request lesson (student + tutor emails)
    const requested = await onEvent(EMAIL_EVENTS.BOOKING_REQUESTED, { bookingId: BOOKING_ID }, deps);
    const created = await onEvent(EMAIL_EVENTS.BOOKING_CREATED, { bookingId: BOOKING_ID }, deps);
    recordAudit("4. Request lesson (student)", EMAIL_EVENTS.BOOKING_REQUESTED, requested.sent === true);
    recordAudit("5. Booking request (tutor)", EMAIL_EVENTS.BOOKING_CREATED, created.sent === true);
    assertEmailQuality(
      emails.find((email) => email.to === "ana@example.com" && email.subject.includes("pedido"))!,
      {
        to: "ana@example.com",
        subject: matrixRow(EMAIL_EVENTS.BOOKING_REQUESTED)!.subject,
        names: ["Ana", "Prof. João", "Inglês"],
        linkPaths: ["/bookings"],
      },
    );
    assertEmailQuality(
      emails.find((email) => email.to === "joao@example.com" && email.subject.includes("reserva"))!,
      {
        to: "joao@example.com",
        subject: matrixRow(EMAIL_EVENTS.BOOKING_CREATED)!.subject,
        names: ["Ana", "Prof. João"],
        linkPaths: ["/tutor/dashboard"],
        forbidden: /ana@example\.com/,
      },
    );

    // 7. Accept booking
    const accepted = await onEvent(EMAIL_EVENTS.BOOKING_ACCEPTED, { bookingId: BOOKING_ID }, deps);
    const paymentRequired = await onEvent(
      EMAIL_EVENTS.PAYMENT_REQUIRED,
      { bookingId: BOOKING_ID },
      deps,
    );
    recordAudit("7. Accept booking", EMAIL_EVENTS.BOOKING_ACCEPTED, accepted.sent === true);
    recordAudit("8. Tutor accepted", EMAIL_EVENTS.BOOKING_ACCEPTED, accepted.sent === true);
    recordAudit("8b. Payment required", EMAIL_EVENTS.PAYMENT_REQUIRED, paymentRequired.sent === true);
    assertEmailQuality(emails.at(-2)!, {
      to: "ana@example.com",
      subject: /aceitou seu pedido de aula/,
      names: ["Ana", "Prof. João", "Inglês"],
      bookingHints: ["R$", "80"],
      linkPaths: [`/aulas/${BOOKING_ID}`, `/mensagens/${CONVERSATION_ID}`],
      forbidden: /joao@example\.com/,
    });
    assertEmailQuality(emails.at(-1)!, {
      to: "ana@example.com",
      subject: matrixRow(EMAIL_EVENTS.PAYMENT_REQUIRED)!.subject,
      names: ["Ana", "Prof. João"],
      linkPaths: [`/aulas/${BOOKING_ID}`],
    });

    // 10. New message
    const newMessage = await onEvent(
      EMAIL_EVENTS.NEW_MESSAGE,
      {
        conversationId: CONVERSATION_ID,
        messageId: MESSAGE_ID,
        recipientUserId: STUDENT_ID,
      },
      deps,
    );
    recordAudit("10. New message email", EMAIL_EVENTS.NEW_MESSAGE, newMessage.sent === true);
    assertEmailQuality(emails.at(-1)!, {
      to: "ana@example.com",
      subject: /nova mensagem de Prof\. João/,
      names: ["Ana", "Prof. João"],
      bookingHints: ["Inglês", "Podemos combinar"],
      linkPaths: [`/mensagens/${CONVERSATION_ID}`],
      forbidden: /joao@example\.com/,
    });

    // 12-15. Payment confirmed
    const paymentConfirmed = await onEvent(
      EMAIL_EVENTS.PAYMENT_CONFIRMED,
      { bookingId: BOOKING_ID },
      deps,
    );
    const lessonConfirmed = await onEvent(
      EMAIL_EVENTS.LESSON_CONFIRMED,
      { bookingId: BOOKING_ID },
      deps,
    );
    const tutorPayment = await onEvent(
      EMAIL_EVENTS.TUTOR_PAYMENT_RECEIVED,
      { bookingId: BOOKING_ID },
      deps,
    );
    recordAudit("14. Payment confirmation", EMAIL_EVENTS.PAYMENT_CONFIRMED, paymentConfirmed.sent === true);
    recordAudit(
      "15. Tutor payment confirmation",
      EMAIL_EVENTS.TUTOR_PAYMENT_RECEIVED,
      tutorPayment.sent === true,
    );
    assertEmailQuality(
      emails.find((email) => email.subject === "Pagamento confirmado")!,
      {
        to: "ana@example.com",
        subject: matrixRow(EMAIL_EVENTS.PAYMENT_CONFIRMED)!.subject,
        names: ["Ana", "Prof. João"],
        bookingHints: ["R$"],
        linkPaths: ["/bookings"],
      },
    );
    const lessonEmails = emails.filter((email) => email.subject.includes("confirmada"));
    expect(Array.isArray(lessonConfirmed) ? lessonConfirmed.every((r) => r.sent) : lessonConfirmed.sent).toBe(
      true,
    );
    recordAudit(
      "13-14. Lesson confirmed",
      EMAIL_EVENTS.LESSON_CONFIRMED,
      lessonEmails.length >= 2,
    );
    assertEmailQuality(
      emails.find(
        (email) => email.to === "joao@example.com" && email.subject.includes("confirmada"),
      )!,
      {
        to: "joao@example.com",
        subject: /confirmada/,
        names: ["Ana", "Prof."],
        linkPaths: ["/tutor/dashboard"],
        forbidden: /ana@example\.com/,
      },
    );

    // 16-17. Reminders
    const reminder24Student = await onEvent(
      EMAIL_EVENTS.LESSON_REMINDER,
      { bookingId: BOOKING_ID, recipientUserId: STUDENT_ID, reminderType: "twenty_four_hour" },
      deps,
    );
    const reminder24Tutor = await onEvent(
      EMAIL_EVENTS.LESSON_REMINDER,
      { bookingId: BOOKING_ID, recipientUserId: TUTOR_ID, reminderType: "twenty_four_hour" },
      deps,
    );
    const reminder1Student = await onEvent(
      EMAIL_EVENTS.LESSON_REMINDER,
      { bookingId: BOOKING_ID, recipientUserId: STUDENT_ID, reminderType: "one_hour" },
      deps,
    );
    const reminder1Tutor = await onEvent(
      EMAIL_EVENTS.LESSON_REMINDER,
      { bookingId: BOOKING_ID, recipientUserId: TUTOR_ID, reminderType: "one_hour" },
      deps,
    );
    recordAudit("16. 24h reminder", EMAIL_EVENTS.LESSON_REMINDER, reminder24Student.sent && reminder24Tutor.sent);
    recordAudit("17. 1h reminder", EMAIL_EVENTS.LESSON_REMINDER, reminder1Student.sent && reminder1Tutor.sent);
    expect(emails.some((email) => email.subject.includes("amanhã"))).toBe(true);
    expect(emails.some((email) => email.subject.includes("1 hora"))).toBe(true);

    // 19. Complete lesson
    const lessonCompleted = await onEvent(EMAIL_EVENTS.LESSON_COMPLETED, { bookingId: BOOKING_ID }, deps);
    const reviewRequest = await onEvent(EMAIL_EVENTS.REVIEW_REQUEST, { bookingId: BOOKING_ID }, deps);
    recordAudit("19. Complete lesson", EMAIL_EVENTS.LESSON_COMPLETED, Array.isArray(lessonCompleted));
    recordAudit("20. Review request", EMAIL_EVENTS.REVIEW_REQUEST, reviewRequest.sent === true);
    assertEmailQuality(emails.at(-1)!, {
      to: "ana@example.com",
      subject: matrixRow(EMAIL_EVENTS.REVIEW_REQUEST)!.subject,
      names: ["Ana", "Prof. João"],
      linkPaths: ["/bookings"],
    });

    // 21. Tutor review notification
    const newReview = await onNewReviewEmail(REVIEW_ID, deps);
    recordAudit("21. Tutor review notification", EMAIL_EVENTS.NEW_REVIEW, newReview.sent === true);
    assertEmailQuality(emails.at(-1)!, {
      to: "joao@example.com",
      subject: matrixRow(EMAIL_EVENTS.NEW_REVIEW)!.subject,
      names: ["Ana", "Prof. João"],
      bookingHints: ["Ótima aula"],
      linkPaths: ["/tutor/dashboard"],
      forbidden: /ana@example\.com/,
    });

    // 22-23. Cancellation + refund
    const cancelled = await onEvent(EMAIL_EVENTS.LESSON_CANCELLED, { bookingId: BOOKING_ID }, deps);
    const refund = await onEvent(
      EMAIL_EVENTS.REFUND_COMPLETED,
      { bookingId: BOOKING_ID, refundAmount: 80 },
      deps,
    );
    recordAudit("22. Cancellation email", EMAIL_EVENTS.LESSON_CANCELLED, Array.isArray(cancelled));
    recordAudit("23. Refund email", EMAIL_EVENTS.REFUND_COMPLETED, refund.sent === true);
    assertEmailQuality(
      emails.find((email) => email.subject === "Estorno confirmado")!,
      {
        to: "ana@example.com",
        subject: matrixRow(EMAIL_EVENTS.REFUND_COMPLETED)!.subject,
        names: ["Ana", "Prof. João"],
        bookingHints: ["R$"],
        linkPaths: ["/bookings"],
      },
    );

    const failures = auditMatrix.filter((row) => row.status === "FAIL");
    expect(failures, JSON.stringify(auditMatrix, null, 2)).toEqual([]);
  });
});

describe("marketplace email resilience audit", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, EMAIL_ENV: "production" };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prevents duplicate booking acceptance emails via outbox idempotency", async () => {
    const db = createMarketplaceDb();
    const { provider, send } = createSentEmailRecorder();
    const outbox = createMemoryEmailOutboxStore();
    const deps = { db: db as never, provider, outbox };

    const first = await onEvent(EMAIL_EVENTS.BOOKING_ACCEPTED, { bookingId: BOOKING_ID }, deps);
    const second = await onEvent(EMAIL_EVENTS.BOOKING_ACCEPTED, { bookingId: BOOKING_ID }, deps);

    expect(first).toMatchObject({ sent: true });
    expect(second).toMatchObject({ sent: true, skipped: true, reason: "already_sent" });
    expect(send).toHaveBeenCalledTimes(1);
    recordAudit("Duplicate booking acceptance", "BOOKING_ACCEPTED idempotency", true);
  });

  it("prevents duplicate payment confirmation emails via outbox idempotency", async () => {
    const db = createMarketplaceDb({ status: "confirmed", paymentStatus: "paid" });
    const { provider, send } = createSentEmailRecorder();
    const outbox = createMemoryEmailOutboxStore();
    const deps = { db: db as never, provider, outbox };

    const first = await onEvent(EMAIL_EVENTS.PAYMENT_CONFIRMED, { bookingId: BOOKING_ID }, deps);
    const second = await onEvent(EMAIL_EVENTS.PAYMENT_CONFIRMED, { bookingId: BOOKING_ID }, deps);

    expect(first).toMatchObject({ sent: true });
    expect(second).toMatchObject({ sent: true, skipped: true, reason: "already_sent" });
    expect(send).toHaveBeenCalledTimes(1);
    recordAudit("Duplicate payment webhook", "PAYMENT_CONFIRMED idempotency", true);
  });

  it("prevents duplicate message notification emails", async () => {
    const db = createMarketplaceDb();
    const { provider, send } = createSentEmailRecorder();
    const outbox = createMemoryEmailOutboxStore();
    const deps = { db: db as never, provider, outbox };
    const payload = {
      conversationId: CONVERSATION_ID,
      messageId: MESSAGE_ID,
      recipientUserId: STUDENT_ID,
    };

    const first = await onEvent(EMAIL_EVENTS.NEW_MESSAGE, payload, deps);
    const second = await onEvent(EMAIL_EVENTS.NEW_MESSAGE, payload, deps);

    expect(first).toMatchObject({ sent: true });
    expect(second).toMatchObject({ sent: true, skipped: true, reason: "already_sent" });
    expect(send).toHaveBeenCalledTimes(1);
    recordAudit("Duplicate message event", "NEW_MESSAGE idempotency", true);
  });

  it("queues JetSend timeout failures for retry without throwing", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = {
      send: vi.fn(async () => {
        throw new JetSendEmailError("timeout", { code: "jetsend_network_error" });
      }),
    };
    const eventKey = buildBookingParticipantEventKey(
      EMAIL_EVENTS.PAYMENT_CONFIRMED,
      BOOKING_ID,
      STUDENT_ID,
    );

    const result = await enqueueAndDeliverTransactionalEmail(
      {
        eventName: EMAIL_EVENTS.PAYMENT_CONFIRMED,
        eventKey,
        recipientEmail: "ana@example.com",
        subject: "Pagamento confirmado",
        templateName: EMAIL_EVENTS.PAYMENT_CONFIRMED,
        text: "texto",
        html: "<p>html</p>",
      },
      { store, provider },
    );

    expect(result).toMatchObject({ sent: false, skipped: true, reason: "queued_for_retry" });
    const record = await store.get(eventKey);
    expect(record?.status).toBe("failed");
    expect(record?.nextRetryAt).toBeInstanceOf(Date);
    recordAudit("JetSend timeout", "retry scheduled", true);
  });

  it("queues JetSend 500 failures for retry", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = {
      send: vi.fn(async () => {
        throw new JetSendEmailError("server error", {
          code: "jetsend_api_error",
          status: 500,
          body: "internal error",
        });
      }),
    };
    const eventKey = buildBookingParticipantEventKey(
      EMAIL_EVENTS.BOOKING_ACCEPTED,
      BOOKING_ID,
      STUDENT_ID,
    );

    const result = await enqueueAndDeliverTransactionalEmail(
      {
        eventName: EMAIL_EVENTS.BOOKING_ACCEPTED,
        eventKey,
        recipientEmail: "ana@example.com",
        subject: "Aceito",
        templateName: EMAIL_EVENTS.BOOKING_ACCEPTED,
        text: "texto",
        html: "<p>html</p>",
      },
      { store, provider },
    );

    expect(result).toMatchObject({ sent: false, skipped: true, reason: "queued_for_retry" });
    recordAudit("JetSend 500 error", "retry scheduled", true);
  });

  it("marks invalid recipients as permanent failures", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = {
      send: vi.fn(async (): Promise<EmailResult> => ({
        sent: false,
        skipped: true,
        reason: "invalid_recipient",
      })),
    };
    const eventKey = buildBookingParticipantEventKey(
      EMAIL_EVENTS.NEW_MESSAGE,
      BOOKING_ID,
      STUDENT_ID,
    );

    const result = await enqueueAndDeliverTransactionalEmail(
      {
        eventName: EMAIL_EVENTS.NEW_MESSAGE,
        eventKey,
        recipientEmail: "not-an-email",
        subject: "Mensagem",
        templateName: EMAIL_EVENTS.NEW_MESSAGE,
        text: "texto",
        html: "<p>html</p>",
      },
      { store, provider },
    );

    expect(result).toMatchObject({ sent: false, skipped: true, reason: "invalid_recipient" });
    const record = await store.get(eventKey);
    expect(record?.status).toBe("permanent_failure");
    recordAudit("Invalid recipient", "permanent failure", true);
  });

  it("recovers from JetSend timeout after retry", async () => {
    const store = createMemoryEmailOutboxStore();
    let calls = 0;
    const provider = {
      send: vi.fn(async (): Promise<EmailResult> => {
        calls += 1;
        if (calls === 1) {
          throw new JetSendEmailError("timeout", { code: "jetsend_network_error" });
        }
        return { sent: true, provider: "jetsend" };
      }),
    };
    const eventKey = buildBookingParticipantEventKey(
      EMAIL_EVENTS.LESSON_REMINDER,
      BOOKING_ID,
      STUDENT_ID,
    );
    const enqueue = await store.enqueue({
      eventName: EMAIL_EVENTS.LESSON_REMINDER,
      eventKey,
      recipientEmail: "ana@example.com",
      subject: "Lembrete",
      templateName: EMAIL_EVENTS.LESSON_REMINDER,
      text: "texto",
      html: "<p>html</p>",
    });

    const first = await deliverOutboxEmail(enqueue.emailId, {
      store,
      provider,
      now: () => new Date("2026-09-01T12:00:00.000Z"),
    });
    expect(first.status).toBe("failed");

    const record = await store.get(enqueue.emailId);
    const retry = await deliverOutboxEmail(enqueue.emailId, {
      store,
      provider,
      now: () => record!.nextRetryAt!,
    });
    expect(retry).toMatchObject({ status: "sent", sent: true });
    expect(calls).toBe(2);
    recordAudit("Retry works", "JetSend recovery", true);
  });

  it("handles delivery webhook replay idempotently", async () => {
    const outboxStore = createMemoryEmailOutboxStore();
    const deliveryEventStore = createMemoryEmailDeliveryEventStore();
    const enqueue = await outboxStore.enqueue({
      eventName: EMAIL_EVENTS.BOOKING_CREATED,
      eventKey: buildBookingParticipantEventKey(
        EMAIL_EVENTS.BOOKING_CREATED,
        BOOKING_ID,
        TUTOR_ID,
      ),
      recipientEmail: "joao@example.com",
      subject: "Nova reserva",
      templateName: EMAIL_EVENTS.BOOKING_CREATED,
      text: "texto",
      html: "<p>html</p>",
    });
    await outboxStore.markSent(enqueue.emailId, {
      provider: "jetsend",
      providerMessageId: "provider-msg-1",
    });

    const event = {
      providerEventId: "evt-replay-1",
      providerMessageId: "provider-msg-1",
      emailOutboxId: enqueue.emailId,
      deliveryStatus: "delivered" as const,
      occurredAt: new Date("2026-09-01T12:00:00.000Z"),
    };

    const first = await processJetSendWebhookEvent(event, { outboxStore, deliveryEventStore });
    const second = await processJetSendWebhookEvent(event, { outboxStore, deliveryEventStore });

    expect(first.alreadyProcessed).toBeUndefined();
    expect(second).toMatchObject({
      alreadyProcessed: true,
      message: WEBHOOK_ALREADY_PROCESSED_MESSAGE,
    });
    recordAudit("Delivery webhook replay", "idempotent", true);
  });

  it("records bounce and complaint delivery statuses", async () => {
    const outboxStore = createMemoryEmailOutboxStore();
    const deliveryEventStore = createMemoryEmailDeliveryEventStore();
    const enqueue = await outboxStore.enqueue({
      eventName: EMAIL_EVENTS.PAYMENT_CONFIRMED,
      eventKey: buildBookingParticipantEventKey(
        EMAIL_EVENTS.PAYMENT_CONFIRMED,
        BOOKING_ID,
        STUDENT_ID,
      ),
      recipientEmail: "ana@example.com",
      subject: "Pagamento confirmado",
      templateName: EMAIL_EVENTS.PAYMENT_CONFIRMED,
      text: "texto",
      html: "<p>html</p>",
    });
    await outboxStore.markSent(enqueue.emailId, {
      provider: "jetsend",
      providerMessageId: "provider-msg-bounce",
    });

    await processJetSendWebhookEvent(
      {
        providerEventId: "evt-bounce",
        providerMessageId: "provider-msg-bounce",
        emailOutboxId: enqueue.emailId,
        deliveryStatus: "bounced",
        occurredAt: new Date("2026-09-01T12:00:00.000Z"),
      },
      { outboxStore, deliveryEventStore },
    );
    const bounced = await outboxStore.get(enqueue.emailId);
    expect(bounced?.deliveryStatus).toBe("bounced");

    const complaintEnqueue = await outboxStore.enqueue({
      eventName: EMAIL_EVENTS.NEW_MESSAGE,
      eventKey: "NEW_MESSAGE:msg-complaint:student-1",
      recipientEmail: "ana@example.com",
      subject: "Mensagem",
      templateName: EMAIL_EVENTS.NEW_MESSAGE,
      text: "texto",
      html: "<p>html</p>",
    });
    await outboxStore.markSent(complaintEnqueue.emailId, {
      provider: "jetsend",
      providerMessageId: "provider-msg-complaint",
    });
    await processJetSendWebhookEvent(
      {
        providerEventId: "evt-complaint",
        providerMessageId: "provider-msg-complaint",
        emailOutboxId: complaintEnqueue.emailId,
        deliveryStatus: "complained",
        occurredAt: new Date("2026-09-01T12:01:00.000Z"),
      },
      { outboxStore, deliveryEventStore },
    );
    const complained = await outboxStore.get(complaintEnqueue.emailId);
    expect(complained?.deliveryStatus).toBe("complained");
    recordAudit("Bounce webhook", "delivery status updated", true);
    recordAudit("Complaint webhook", "delivery status updated", true);
  });

  it("does not break marketplace transactions when email dispatch throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let bookingConfirmed = false;

    await safeNotify(async () => {
      bookingConfirmed = true;
      throw new Error("JetSend indisponível");
    }, "confirmed_booking");

    expect(bookingConfirmed).toBe(true);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    recordAudit("JetSend failure isolation", "safeNotify swallows email errors", true);
  });

  it("processes due outbox retries in batch after temporary failures", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = {
      send: vi.fn(async (): Promise<EmailResult> => ({ sent: true, provider: "jetsend" })),
    };
    const eventKey = buildBookingParticipantEventKey(
      EMAIL_EVENTS.PAYMENT_FAILED,
      BOOKING_ID,
      STUDENT_ID,
    );
    const enqueue = await store.enqueue({
      eventName: EMAIL_EVENTS.PAYMENT_FAILED,
      eventKey,
      recipientEmail: "ana@example.com",
      subject: "Pagamento não confirmado",
      templateName: EMAIL_EVENTS.PAYMENT_FAILED,
      text: "texto",
      html: "<p>html</p>",
    });
    await store.markFailed(enqueue.emailId, {
      attempts: 1,
      lastError: "temporary",
      failedAt: new Date("2026-09-01T12:00:00.000Z"),
      nextRetryAt: new Date("2026-09-01T12:01:00.000Z"),
      status: "failed",
    });

    const results = await processDueOutboxEmails({
      store,
      provider,
      now: () => new Date("2026-09-01T12:02:00.000Z"),
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ status: "sent", sent: true });
    recordAudit("Batch retry processing", "processDueOutboxEmails", true);
  });
});

describe("audit matrix summary", () => {
  it("has no critical failures in the recorded audit matrix", () => {
    const failures = auditMatrix.filter((row) => row.status === "FAIL");
    if (failures.length > 0) {
      // eslint-disable-next-line no-console
      console.table(auditMatrix);
    }
    expect(failures).toEqual([]);
  });
});
