import { describe, expect, it, vi } from "vitest";
import { EMAIL_EVENTS } from "@/lib/email/events";
import type { EmailProvider, EmailResult } from "@/lib/email/provider";
import { createMemoryEmailOutboxStore } from "@/lib/email/outbox";
import { onEvent } from "@/lib/email/send";

function createMockProvider(): EmailProvider & { send: ReturnType<typeof vi.fn> } {
  const send = vi.fn(async (): Promise<EmailResult> => ({ sent: true, provider: "resend" }));
  return { send };
}

function createMockDb() {
  const users = new Map<string, Record<string, unknown>>([
    ["student-1", { displayName: "Ana Silva", email: "ana@example.com" }],
    ["tutor-owner", { displayName: "João Tutor", email: "joao@example.com" }],
  ]);
  const tutors = new Map<string, Record<string, unknown>>([
    ["tutor-1", { name: "Prof. João", userId: "tutor-owner", subject: "Inglês" }],
  ]);
  const bookings = new Map<string, Record<string, unknown>>([
    [
      "booking-1",
      {
        studentId: "student-1",
        tutorId: "tutor-1",
        type: "individual",
        status: "pending",
        paymentStatus: "awaiting_payment",
        scheduledAt: new Date("2026-09-08T19:00:00.000Z"),
        meetingUrl: "https://meet.example/abc",
        price: 80,
      },
    ],
  ]);

  return {
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
                      : undefined;
              return {
                exists: Boolean(data),
                id,
                data: () => data,
              };
            },
          };
        },
      };
    },
  };
}

describe("onEvent", () => {
  it("sends payment-confirmed email to the student", async () => {
    const provider = createMockProvider();
    const db = createMockDb();

    const result = await onEvent(
      EMAIL_EVENTS.PAYMENT_CONFIRMED,
      { bookingId: "booking-1" },
      { db: db as never, provider, outbox: false },
    );

    expect(result).toMatchObject({ sent: true });
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(provider.send.mock.calls[0]?.[0]).toMatchObject({
      to: "ana@example.com",
      subject: "Sua aula foi confirmada",
    });
  });

  it("sends booking-created email to the tutor", async () => {
    const provider = createMockProvider();
    const db = createMockDb();

    const result = await onEvent(
      EMAIL_EVENTS.BOOKING_CREATED,
      { bookingId: "booking-1" },
      { db: db as never, provider, outbox: false },
    );

    expect(result).toMatchObject({ sent: true });
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(provider.send.mock.calls[0]?.[0]).toMatchObject({
      to: "joao@example.com",
      subject: "Nova reserva pendente no Aprendiz Bay",
    });
  });

  it("sends booking-accepted email to the student with marketplace details", async () => {
    const provider = createMockProvider();
    const db = createMockDb();

    const result = await onEvent(
      EMAIL_EVENTS.BOOKING_ACCEPTED,
      { bookingId: "booking-1" },
      { db: db as never, provider, outbox: false },
    );

    expect(result).toMatchObject({ sent: true });
    expect(provider.send).toHaveBeenCalledTimes(1);

    const payload = provider.send.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      to: "ana@example.com",
      subject: "Prof. João aceitou seu pedido de aula",
    });
    expect(payload?.text).toContain("Olá, Ana!");
    expect(payload?.text).toContain("Matéria: Inglês");
    expect(payload?.text).toContain("Status: Pedido aceito — aguardando pagamento");
    expect(payload?.text).toMatch(/Valor: R\$\s?80,00/);
    expect(payload?.text).toContain("/aulas/booking-1");
    expect(payload?.text).toContain("/mensagens/student-1_tutor-1");
    expect(payload?.text).not.toMatch(/joao@example\.com|\+55|telefone/i);
  });

  it("does not send duplicate booking-accepted emails through the outbox", async () => {
    const provider = createMockProvider();
    const db = createMockDb();
    const outbox = createMemoryEmailOutboxStore();

    const first = await onEvent(
      EMAIL_EVENTS.BOOKING_ACCEPTED,
      { bookingId: "booking-1" },
      { db: db as never, provider, outbox },
    );
    const second = await onEvent(
      EMAIL_EVENTS.BOOKING_ACCEPTED,
      { bookingId: "booking-1" },
      { db: db as never, provider, outbox },
    );

    expect(first).toMatchObject({ sent: true });
    expect(second).toMatchObject({ sent: true, skipped: true, reason: "already_sent" });
    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it("skips when the booking is missing", async () => {
    const provider = createMockProvider();
    const db = createMockDb();

    const result = await onEvent(
      EMAIL_EVENTS.PAYMENT_FAILED,
      { bookingId: "missing" },
      { db: db as never, provider, outbox: false },
    );

    expect(result).toMatchObject({ sent: false, skipped: true, reason: "booking_not_found" });
    expect(provider.send).not.toHaveBeenCalled();
  });
});
