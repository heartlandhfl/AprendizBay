import { describe, expect, it } from "vitest";
import { EMAIL_EVENTS } from "@/lib/email/events";
import {
  buildBookingAcceptedEmail,
  buildEmailTemplate,
  buildNewMessageEmail,
  firstDisplayName,
  formatBookingAcceptedStatusLabel,
} from "@/lib/email/templates";

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
          recipientName: "Ana Silva",
          senderName: "Prof. João",
          preview: "Olá! Podemos remarcar?",
          lessonContextLabel: "Inglês · Individual · terça-feira, 8 de setembro de 2026 às 19:00",
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

    expect(content.subject).toBe("Pagamento confirmado");
    expect(content.text).toContain("Recebemos o pagamento");
  });
});

describe("buildBookingAcceptedEmail", () => {
  const baseInput = {
    studentName: "Ana Silva",
    tutorName: "Prof. João",
    subjectLabel: "Inglês",
    bookingType: "individual" as const,
    scheduledAt,
    statusLabel: "Pedido aceito — aguardando pagamento",
    priceLabel: "R$ 80,00",
    bookingUrl: "https://aprendizbay.com/aulas/booking-1",
    messagesUrl: "https://aprendizbay.com/mensagens/student-1_tutor-1",
    bookingsUrl: "https://aprendizbay.com/bookings",
  };

  it("uses a warm Portuguese subject with the tutor name", () => {
    const content = buildBookingAcceptedEmail(baseInput);

    expect(content.subject).toBe("Prof. João aceitou seu pedido de aula");
  });

  it("greets the student by first name and includes lesson details", () => {
    const content = buildBookingAcceptedEmail(baseInput);

    expect(firstDisplayName(baseInput.studentName)).toBe("Ana");
    expect(content.text).toContain("Olá, Ana!");
    expect(content.text).toContain("Prof. João aceitou seu pedido de aula");
    expect(content.text).toContain("Matéria: Inglês");
    expect(content.text).toContain("Tipo de aula: Individual");
    expect(content.text).toContain("Status: Pedido aceito — aguardando pagamento");
    expect(content.text).toMatch(/Valor: R\$\s?80,00/);
    expect(content.text).toContain("Ver minha aula: https://aprendizbay.com/aulas/booking-1");
    expect(content.text).toContain(
      "Conversar com o professor: https://aprendizbay.com/mensagens/student-1_tutor-1",
    );
    expect(content.text).toContain("Aprendiz Bay");
  });

  it("renders responsive HTML with CTAs and footer without private contact info", () => {
    const content = buildBookingAcceptedEmail(baseInput);

    expect(content.html).toContain('lang="pt-BR"');
    expect(content.html).toContain('name="viewport"');
    expect(content.html).toContain("Ver minha aula");
    expect(content.html).toContain("Conversar com o professor");
    expect(content.html).toContain("Aprendiz Bay");
    expect(content.html).toContain("Matéria:");
    expect(content.html).toContain("Inglês");
    expect(content.html).not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(content.html).not.toMatch(/\+55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
  });

  it("directs the student to messaging when there is no price", () => {
    const content = buildBookingAcceptedEmail({
      ...baseInput,
      priceLabel: undefined,
      statusLabel: "Pedido aceito",
    });

    expect(content.text).toContain(
      "Agora você pode conversar com Prof. João pela Aprendiz Bay para combinar os detalhes da sua aula.",
    );
    expect(content.text).not.toContain("finalize o pagamento");
  });
});

describe("formatBookingAcceptedStatusLabel", () => {
  it("prioritizes awaiting payment after tutor acceptance", () => {
    expect(formatBookingAcceptedStatusLabel("pending", "awaiting_payment")).toBe(
      "Pedido aceito — aguardando pagamento",
    );
  });
});

describe("buildNewMessageEmail", () => {
  it("uses the sender name in the subject and CTA copy", () => {
    const content = buildNewMessageEmail({
      recipientName: "Ana Silva",
      senderName: "Prof. João",
      preview: "Podemos combinar a aula?",
      messagesUrl: "https://aprendizbay.com/mensagens/student-1_tutor-1",
    });

    expect(content.subject).toBe("Você recebeu uma nova mensagem de Prof. João");
    expect(content.text).toContain("Olá, Ana!");
    expect(content.text).toContain("Responder na AprendizBay:");
    expect(content.html).toContain("Responder na AprendizBay");
    expect(content.html).toContain('lang="pt-BR"');
  });
});
