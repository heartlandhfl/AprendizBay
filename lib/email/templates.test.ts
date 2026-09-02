import { describe, expect, it } from "vitest";
import { EMAIL_EVENTS } from "@/lib/email/events";
import { buildEmailTemplate } from "@/lib/email/templates";

const scheduledAt = new Date("2026-09-08T19:00:00.000Z");

describe("buildEmailTemplate", () => {
  it("renders Portuguese subjects for all app email events", () => {
    const cases: Array<{ event: (typeof EMAIL_EVENTS)[keyof typeof EMAIL_EVENTS]; input: Record<string, unknown> }> = [
      {
        event: EMAIL_EVENTS.USER_REGISTERED,
        input: { displayName: "Ana", roleLabel: "aluno", bookingsUrl: "https://aprendizbay.com/bookings" },
      },
      {
        event: EMAIL_EVENTS.BOOKING_CREATED,
        input: {
          tutorName: "Prof. João",
          studentName: "Ana",
          bookingType: "individual",
          scheduledAt,
          dashboardUrl: "https://aprendizbay.com/tutor/dashboard",
        },
      },
      {
        event: EMAIL_EVENTS.BOOKING_ACCEPTED,
        input: {
          studentName: "Ana",
          tutorName: "Prof. João",
          bookingType: "individual",
          scheduledAt,
          priceLabel: "R$ 80,00",
          bookingsUrl: "https://aprendizbay.com/bookings",
        },
      },
      {
        event: EMAIL_EVENTS.PAYMENT_CONFIRMED,
        input: {
          studentName: "Ana",
          tutorName: "Prof. João",
          bookingType: "individual",
          scheduledAt,
          meetingUrl: "https://meet.example/abc",
          bookingsUrl: "https://aprendizbay.com/bookings",
        },
      },
      {
        event: EMAIL_EVENTS.PAYMENT_FAILED,
        input: {
          studentName: "Ana",
          tutorName: "Prof. João",
          bookingType: "individual",
          scheduledAt,
          bookingsUrl: "https://aprendizbay.com/bookings",
        },
      },
      {
        event: EMAIL_EVENTS.LESSON_REMINDER,
        input: {
          recipientName: "Ana",
          studentName: "Ana",
          tutorName: "Prof. João",
          bookingType: "individual",
          scheduledAt,
          meetingUrl: "https://meet.example/abc",
        },
      },
      {
        event: EMAIL_EVENTS.LESSON_CANCELLED,
        input: {
          recipientName: "Ana",
          studentName: "Ana",
          tutorName: "Prof. João",
          bookingType: "individual",
          scheduledAt,
          cancelledByLabel: "um dos participantes",
          bookingsUrl: "https://aprendizbay.com/bookings",
        },
      },
      {
        event: EMAIL_EVENTS.REFUND_COMPLETED,
        input: {
          studentName: "Ana",
          tutorName: "Prof. João",
          bookingType: "individual",
          scheduledAt,
          refundAmountLabel: "R$ 80,00",
          bookingsUrl: "https://aprendizbay.com/bookings",
        },
      },
      {
        event: EMAIL_EVENTS.LESSON_COMPLETED,
        input: {
          recipientName: "Ana",
          studentName: "Ana",
          tutorName: "Prof. João",
          bookingType: "individual",
          scheduledAt,
          bookingsUrl: "https://aprendizbay.com/bookings",
        },
      },
      {
        event: EMAIL_EVENTS.REVIEW_REQUEST,
        input: {
          studentName: "Ana",
          tutorName: "Prof. João",
          bookingType: "individual",
          scheduledAt,
          reviewUrl: "https://aprendizbay.com/bookings",
        },
      },
      {
        event: EMAIL_EVENTS.NEW_MESSAGE,
        input: {
          recipientName: "Ana",
          senderName: "Prof. João",
          preview: "Olá! Podemos remarcar?",
          messagesUrl: "https://aprendizbay.com/mensagens/conv-1",
        },
      },
    ];

    for (const { event, input } of cases) {
      const content = buildEmailTemplate(event, input as never);
      expect(content.subject.length).toBeGreaterThan(0);
      expect(content.text).toContain("Aprendiz Bay");
      expect(content.html).toContain('lang="pt-BR"');
      expect(content.subject).not.toMatch(/welcome|payment failed|booking created/i);
    }
  });

  it("uses the payment-confirmed subject for confirmed bookings", () => {
    const content = buildEmailTemplate(EMAIL_EVENTS.PAYMENT_CONFIRMED, {
      studentName: "Ana",
      tutorName: "Prof. João",
      bookingType: "individual",
      scheduledAt,
      meetingUrl: "https://meet.example/abc",
      bookingsUrl: "https://aprendizbay.com/bookings",
    });

    expect(content.subject).toBe("Sua aula foi confirmada");
    expect(content.text).toContain("está confirmada");
  });
});
