import { describe, expect, it } from "vitest";
import { EMAIL_EVENTS } from "@/lib/email/events";
import { TRANSACTIONAL_EMAIL_MATRIX } from "@/lib/email/event-catalog";
import { buildEmailTemplate } from "@/lib/email/templates";

const scheduledAt = new Date("2026-09-08T19:00:00.000Z");

const SAMPLE_INPUTS: Record<string, Record<string, unknown>> = {
  [EMAIL_EVENTS.USER_REGISTERED]: {
    displayName: "Ana Silva",
    roleLabel: "aluno",
    actionUrl: "https://aprendizbay.com/bookings",
  },
  [EMAIL_EVENTS.EMAIL_VERIFICATION]: {
    displayName: "Ana Silva",
    verificationUrl: "https://aprendizbay.com/verify?token=abc",
  },
  [EMAIL_EVENTS.BOOKING_REQUESTED]: {
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    subjectLabel: "Inglês",
    bookingType: "individual",
    scheduledAt,
    bookingsUrl: "https://aprendizbay.com/bookings",
  },
  [EMAIL_EVENTS.BOOKING_CREATED]: {
    tutorName: "Prof. João",
    studentName: "Ana Silva",
    bookingType: "individual",
    scheduledAt,
    dashboardUrl: "https://aprendizbay.com/tutor/dashboard",
  },
  [EMAIL_EVENTS.BOOKING_ACCEPTED]: {
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    subjectLabel: "Inglês",
    bookingType: "individual",
    scheduledAt,
    statusLabel: "Pedido aceito — aguardando pagamento",
    priceLabel: "R$ 80,00",
    bookingUrl: "https://aprendizbay.com/aulas/booking-1",
    messagesUrl: "https://aprendizbay.com/mensagens/student-1_tutor-1",
    bookingsUrl: "https://aprendizbay.com/bookings",
  },
  [EMAIL_EVENTS.PAYMENT_REQUIRED]: {
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    bookingType: "individual",
    scheduledAt,
    priceLabel: "R$ 80,00",
    paymentUrl: "https://aprendizbay.com/aulas/booking-1",
  },
  [EMAIL_EVENTS.NEW_MESSAGE]: {
    recipientName: "Ana Silva",
    senderName: "Prof. João",
    preview: "Olá! Podemos combinar a aula?",
    messagesUrl: "https://aprendizbay.com/mensagens/conv-1",
  },
  [EMAIL_EVENTS.PAYMENT_CONFIRMED]: {
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    bookingType: "individual",
    scheduledAt,
    amountLabel: "R$ 80,00",
    bookingsUrl: "https://aprendizbay.com/bookings",
  },
  [EMAIL_EVENTS.LESSON_CONFIRMED]: {
    recipientName: "Ana Silva",
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    bookingType: "individual",
    scheduledAt,
    audience: "student",
    lessonUrl: "https://aprendizbay.com/aulas/booking-1",
  },
  [EMAIL_EVENTS.TUTOR_PAYMENT_RECEIVED]: {
    tutorName: "Prof. João",
    studentName: "Ana Silva",
    bookingType: "individual",
    scheduledAt,
    amountLabel: "R$ 80,00",
    dashboardUrl: "https://aprendizbay.com/tutor/dashboard",
  },
  [EMAIL_EVENTS.LESSON_REMINDER]: {
    recipientName: "Ana Silva",
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    bookingType: "individual",
    scheduledAt,
    reminderType: "one_hour",
  },
  [EMAIL_EVENTS.LESSON_COMPLETED]: {
    recipientName: "Ana Silva",
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    bookingType: "individual",
    scheduledAt,
    bookingsUrl: "https://aprendizbay.com/bookings",
  },
  [EMAIL_EVENTS.REVIEW_REQUEST]: {
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    bookingType: "individual",
    scheduledAt,
    reviewUrl: "https://aprendizbay.com/bookings",
  },
  [EMAIL_EVENTS.LESSON_CANCELLED]: {
    recipientName: "Ana Silva",
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    bookingType: "individual",
    scheduledAt,
    cancelledByLabel: "um dos participantes",
    bookingsUrl: "https://aprendizbay.com/bookings",
  },
  [EMAIL_EVENTS.REFUND_COMPLETED]: {
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    bookingType: "individual",
    scheduledAt,
    refundAmountLabel: "R$ 80,00",
    bookingsUrl: "https://aprendizbay.com/bookings",
  },
  [EMAIL_EVENTS.PAYMENT_FAILED]: {
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    bookingType: "individual",
    scheduledAt,
    bookingsUrl: "https://aprendizbay.com/bookings",
  },
  [EMAIL_EVENTS.NEW_REVIEW]: {
    tutorName: "Prof. João",
    studentName: "Ana Silva",
    rating: 5,
    comment: "Ótima aula",
    dashboardUrl: "https://aprendizbay.com/tutor/dashboard",
  },
  [EMAIL_EVENTS.TUTOR_PROFILE_INCOMPLETE]: {
    tutorName: "Prof. João",
    onboardingUrl: "https://aprendizbay.com/tutor/onboarding",
  },
  [EMAIL_EVENTS.TUTOR_VERIFICATION_SUBMITTED]: {
    tutorName: "Prof. João",
    dashboardUrl: "https://aprendizbay.com/tutor/dashboard",
  },
  [EMAIL_EVENTS.TUTOR_VERIFICATION_APPROVED]: {
    tutorName: "Prof. João",
    dashboardUrl: "https://aprendizbay.com/tutor/dashboard",
  },
  [EMAIL_EVENTS.TUTOR_PROFILE_PUBLISHED]: {
    tutorName: "Prof. João",
    profileUrl: "https://aprendizbay.com/tutor/tutor-1",
    dashboardUrl: "https://aprendizbay.com/tutor/dashboard",
  },
};

describe("transactional email lifecycle matrix", () => {
  it("defines a row for every transactional event", () => {
    const catalogEvents = new Set(TRANSACTIONAL_EMAIL_MATRIX.map((row) => row.event));
    for (const event of Object.values(EMAIL_EVENTS)) {
      expect(catalogEvents.has(event)).toBe(true);
    }
  });

  it.each(Object.values(EMAIL_EVENTS))("renders %s in Brazilian Portuguese with HTML and text", (event) => {
    const input = SAMPLE_INPUTS[event];
    expect(input).toBeDefined();

    const content = buildEmailTemplate(event, input as never);
    expect(content.subject.length).toBeGreaterThan(0);
    expect(content.text).toContain("Aprendiz Bay");
    expect(content.html).toContain('lang="pt-BR"');
    expect(content.html).not.toMatch(/welcome|payment failed|booking created/i);
  });

  it("escapes HTML in user-generated review comments", () => {
    const content = buildEmailTemplate(EMAIL_EVENTS.NEW_REVIEW, {
      tutorName: "Prof. João",
      studentName: "Ana",
      rating: 5,
      comment: '<script>alert("xss")</script>',
      dashboardUrl: "https://aprendizbay.com/tutor/dashboard",
    });

    expect(content.html).toContain("&lt;script&gt;");
    expect(content.html).not.toContain('<script>alert("xss")</script>');
  });

  it("uses distinct subjects for payment and lesson confirmation", () => {
    const payment = buildEmailTemplate(
      EMAIL_EVENTS.PAYMENT_CONFIRMED,
      SAMPLE_INPUTS[EMAIL_EVENTS.PAYMENT_CONFIRMED] as never,
    );
    const lesson = buildEmailTemplate(
      EMAIL_EVENTS.LESSON_CONFIRMED,
      SAMPLE_INPUTS[EMAIL_EVENTS.LESSON_CONFIRMED] as never,
    );

    expect(payment.subject).toBe("Pagamento confirmado");
    expect(lesson.subject).toBe("Sua aula está confirmada");
  });

  it("supports 24-hour and 1-hour reminder subjects", () => {
    const oneHour = buildEmailTemplate(EMAIL_EVENTS.LESSON_REMINDER, {
      ...SAMPLE_INPUTS[EMAIL_EVENTS.LESSON_REMINDER],
      reminderType: "one_hour",
    } as never);
    const twentyFour = buildEmailTemplate(EMAIL_EVENTS.LESSON_REMINDER, {
      ...SAMPLE_INPUTS[EMAIL_EVENTS.LESSON_REMINDER],
      reminderType: "twenty_four_hour",
    } as never);

    expect(oneHour.subject).toContain("1 hora");
    expect(twentyFour.subject).toContain("amanhã");
  });
});
