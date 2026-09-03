import { describe, expect, it, vi } from "vitest";
import { EMAIL_EVENTS } from "@/lib/email/events";
import { MESSAGE_EMAIL_COOLDOWN_MS } from "@/lib/email/message-notification-policy";
import type { EmailProvider, EmailResult } from "@/lib/email/provider";
import { createMemoryEmailOutboxStore } from "@/lib/email/outbox";
import { onEvent } from "@/lib/email/send";
import { buildNewMessageEmail } from "@/lib/email/templates";

function createMockProvider(): EmailProvider & { send: ReturnType<typeof vi.fn> } {
  const send = vi.fn(async (): Promise<EmailResult> => ({ sent: true, provider: "resend" }));
  return { send };
}

interface MockDbOptions {
  recipientEmail?: string;
  lastMessageEmailSentAt?: Record<string, Date>;
}

function createMessagingMockDb(options: MockDbOptions = {}) {
  const conversationId = "student-1_tutor-1";
  const users = new Map<string, Record<string, unknown>>([
    ["student-1", { displayName: "Ana Silva", email: "ana@example.com" }],
    ["tutor-owner", { displayName: "João Tutor", email: "joao@example.com" }],
    ["student-2", { displayName: "Bruno", email: "bruno@example.com" }],
  ]);
  const tutors = new Map<string, Record<string, unknown>>([
    ["tutor-1", { name: "Prof. João", userId: "tutor-owner", subject: "Inglês" }],
  ]);
  const conversations = new Map<string, Record<string, unknown>>([
    [
      conversationId,
      {
        studentId: "student-1",
        tutorId: "tutor-1",
        participantIds: ["student-1", "tutor-1"],
        studentName: "Ana Silva",
        tutorName: "Prof. João",
        lastMessageEmailSentAt: options.lastMessageEmailSentAt,
      },
    ],
    [
      "student-2_tutor-1",
      {
        studentId: "student-2",
        tutorId: "tutor-1",
        participantIds: ["student-2", "tutor-1"],
        studentName: "Bruno",
        tutorName: "Prof. João",
      },
    ],
  ]);
  const messages = new Map<string, Record<string, unknown>>([
    [
      `${conversationId}/msg-1`,
      { senderId: "tutor-1", text: "Olá! Podemos combinar a aula?" },
    ],
    [
      `${conversationId}/msg-2`,
      { senderId: "tutor-1", text: "Segunda mensagem rapidinha." },
    ],
    [
      `${conversationId}/msg-html`,
      { senderId: "tutor-1", text: '<script>alert("oi")</script> Olá!' },
    ],
    [
      `student-2_tutor-1/msg-other`,
      { senderId: "tutor-1", text: "Outra conversa." },
    ],
  ]);
  const bookings = [
    {
      id: "booking-1",
      studentId: "student-1",
      tutorId: "tutor-1",
      type: "individual",
      status: "pending",
      scheduledAt: new Date("2026-09-08T19:00:00.000Z"),
    },
  ];
  const updates: Array<{ path: string; data: Record<string, unknown> }> = [];

  if (options.recipientEmail === "") {
    users.set("student-1", { displayName: "Ana Silva" });
  }

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
                    : name === "conversations"
                      ? conversations.get(id)
                      : undefined;
              return {
                exists: Boolean(data),
                id,
                data: () => data,
              };
            },
            collection() {
              return {
                doc(messageId: string) {
                  return {
                    async get() {
                      const data = messages.get(`${id}/${messageId}`);
                      return {
                        exists: Boolean(data),
                        id: messageId,
                        data: () => data,
                      };
                    },
                  };
                },
              };
            },
            async update(data: Record<string, unknown>) {
              updates.push({ path: `${name}/${id}`, data });
              const current = conversations.get(id);
              if (current) {
                conversations.set(id, { ...current, ...data });
              }
            },
          };
        },
        where(field: string, _op: string, value: string) {
          return {
            where(nextField: string, _nextOp: string, nextValue: string) {
              return {
                async get() {
                  const docs = bookings
                    .filter(
                      (booking) =>
                        booking[field as keyof typeof booking] === value &&
                        booking[nextField as keyof typeof booking] === nextValue,
                    )
                    .map((booking) => ({
                      id: booking.id,
                      data: () => booking,
                    }));
                  return { docs };
                },
              };
            },
            async get() {
              const docs = bookings
                .filter((booking) => booking[field as keyof typeof booking] === value)
                .map((booking) => ({
                  id: booking.id,
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

const basePayload = {
  conversationId: "student-1_tutor-1",
  messageId: "msg-1",
  recipientUserId: "student-1",
};

describe("NEW_MESSAGE email", () => {
  it("sends a polished notification to the conversation recipient", async () => {
    const provider = createMockProvider();
    const db = createMessagingMockDb();

    const result = await onEvent(EMAIL_EVENTS.NEW_MESSAGE, basePayload, {
      db: db as never,
      provider,
      outbox: false,
    });

    expect(result).toMatchObject({ sent: true });
    expect(provider.send).toHaveBeenCalledTimes(1);

    const payload = provider.send.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      to: "ana@example.com",
      subject: "Você recebeu uma nova mensagem de Prof. João",
    });
    expect(payload?.text).toContain("Olá, Ana!");
    expect(payload?.text).toContain("Olá! Podemos combinar a aula?");
    expect(payload?.text).toContain("Contexto da aula:");
    expect(payload?.text).toContain("Inglês");
    expect(payload?.text).toContain("Responder na AprendizBay:");
    expect(payload?.text).not.toMatch(/joao@example\.com|\+55/);
    expect(payload?.html).toContain("Responder na AprendizBay");
    expect(db.updates.some((update) => update.path === "conversations/student-1_tutor-1")).toBe(
      true,
    );
  });

  it("prevents the sender from notifying themselves", async () => {
    const provider = createMockProvider();
    const db = createMessagingMockDb();

    const result = await onEvent(
      EMAIL_EVENTS.NEW_MESSAGE,
      { ...basePayload, recipientUserId: "tutor-1" },
      { db: db as never, provider, outbox: false },
    );

    expect(result).toMatchObject({ sent: false, skipped: true, reason: "self_notification" });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("rejects unauthorized recipients", async () => {
    const provider = createMockProvider();
    const db = createMessagingMockDb();

    const result = await onEvent(
      EMAIL_EVENTS.NEW_MESSAGE,
      { ...basePayload, recipientUserId: "intruder-1" },
      { db: db as never, provider, outbox: false },
    );

    expect(result).toMatchObject({ sent: false, skipped: true, reason: "unauthorized_recipient" });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("skips when the recipient has no email", async () => {
    const provider = createMockProvider();
    const db = createMessagingMockDb({ recipientEmail: "" });

    const result = await onEvent(EMAIL_EVENTS.NEW_MESSAGE, basePayload, {
      db: db as never,
      provider,
      outbox: false,
    });

    expect(result).toMatchObject({ sent: false, skipped: true, reason: "missing_recipient" });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("does not send duplicate emails for the same message event", async () => {
    const provider = createMockProvider();
    const db = createMessagingMockDb();
    const outbox = createMemoryEmailOutboxStore();

    const first = await onEvent(EMAIL_EVENTS.NEW_MESSAGE, basePayload, {
      db: db as never,
      provider,
      outbox,
    });
    const second = await onEvent(EMAIL_EVENTS.NEW_MESSAGE, basePayload, {
      db: db as never,
      provider,
      outbox,
    });

    expect(first).toMatchObject({ sent: true });
    expect(second).toMatchObject({ sent: true, skipped: true, reason: "already_sent" });
    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it("suppresses rapid follow-up emails in the same conversation", async () => {
    const provider = createMockProvider();
    const db = createMessagingMockDb({
      lastMessageEmailSentAt: {
        "student-1": new Date(Date.now() - 60_000),
      },
    });

    const result = await onEvent(
      EMAIL_EVENTS.NEW_MESSAGE,
      { ...basePayload, messageId: "msg-2" },
      { db: db as never, provider, outbox: false },
    );

    expect(result).toMatchObject({ sent: false, skipped: true, reason: "recently_notified" });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("still sends when the cooldown has elapsed", async () => {
    const provider = createMockProvider();
    const db = createMessagingMockDb({
      lastMessageEmailSentAt: {
        "student-1": new Date(Date.now() - MESSAGE_EMAIL_COOLDOWN_MS),
      },
    });

    const result = await onEvent(
      EMAIL_EVENTS.NEW_MESSAGE,
      { ...basePayload, messageId: "msg-2" },
      { db: db as never, provider, outbox: false },
    );

    expect(result).toMatchObject({ sent: true });
    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it("sends for a different conversation independently", async () => {
    const provider = createMockProvider();
    const db = createMessagingMockDb({
      lastMessageEmailSentAt: {
        "student-1": new Date(),
      },
    });

    const result = await onEvent(
      EMAIL_EVENTS.NEW_MESSAGE,
      {
        conversationId: "student-2_tutor-1",
        messageId: "msg-other",
        recipientUserId: "student-2",
      },
      { db: db as never, provider, outbox: false },
    );

    expect(result).toMatchObject({ sent: true });
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(provider.send.mock.calls[0]?.[0]).toMatchObject({ to: "bruno@example.com" });
  });

  it("escapes HTML in the message preview", () => {
    const content = buildNewMessageEmail({
      recipientName: "Ana Silva",
      senderName: "Prof. João",
      preview: '<script>alert("oi")</script> Olá!',
      messagesUrl: "https://aprendizbay.com/mensagens/student-1_tutor-1",
    });

    expect(content.html).toContain("&lt;script&gt;");
    expect(content.html).not.toContain('<script>alert("oi")</script>');
    expect(content.text).toContain('<script>alert("oi")</script> Olá!');
  });
});
