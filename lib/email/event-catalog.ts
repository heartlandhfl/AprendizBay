import { EMAIL_EVENTS, type EmailEventName } from "@/lib/email/events";
import {
  buildBookingParticipantEventKey,
  buildEmailVerificationEventKey,
  buildLessonReminderEventKey,
  buildNewMessageEventKey,
  buildNewReviewEventKey,
  buildTutorLifecycleEventKey,
  buildUserRegisteredEventKey,
} from "@/lib/email/outbox/event-keys";

export interface EmailEventMatrixRow {
  event: EmailEventName;
  trigger: string;
  recipient: string;
  subject: string;
  template: string;
  cta: string;
  idempotencyKey: string;
}

function bookingKey(event: string, bookingId = "{bookingId}", participantId = "{participantId}") {
  return buildBookingParticipantEventKey(event, bookingId, participantId);
}

export const TRANSACTIONAL_EMAIL_MATRIX: EmailEventMatrixRow[] = [
  {
    event: EMAIL_EVENTS.USER_REGISTERED,
    trigger: "Conta criada (aluno ou professor)",
    recipient: "Usuário recém-cadastrado",
    subject: "Bem-vindo(a) ao Aprendiz Bay",
    template: "buildUserRegisteredEmail",
    cta: "Explorar a plataforma / Completar meu perfil",
    idempotencyKey: buildUserRegisteredEventKey("{userId}"),
  },
  {
    event: EMAIL_EVENTS.EMAIL_VERIFICATION,
    trigger: "Cadastro com e-mail e senha",
    recipient: "Usuário",
    subject: "Confirme seu e-mail no Aprendiz Bay",
    template: "buildEmailVerificationEmail",
    cta: "Confirmar e-mail",
    idempotencyKey: buildEmailVerificationEventKey("{userId}"),
  },
  {
    event: EMAIL_EVENTS.BOOKING_REQUESTED,
    trigger: "Aluno solicita aula",
    recipient: "Aluno",
    subject: "Recebemos seu pedido de aula",
    template: "buildBookingRequestedEmail",
    cta: "Acompanhar pedido",
    idempotencyKey: bookingKey(EMAIL_EVENTS.BOOKING_REQUESTED, "{bookingId}", "{studentId}"),
  },
  {
    event: EMAIL_EVENTS.BOOKING_CREATED,
    trigger: "Aluno solicita aula",
    recipient: "Professor",
    subject: "Nova reserva pendente no Aprendiz Bay",
    template: "buildBookingCreatedEmail",
    cta: "Abrir meu painel",
    idempotencyKey: bookingKey(EMAIL_EVENTS.BOOKING_CREATED, "{bookingId}", "{tutorId}"),
  },
  {
    event: EMAIL_EVENTS.BOOKING_ACCEPTED,
    trigger: "Professor aceita pedido",
    recipient: "Aluno",
    subject: "{tutorName} aceitou seu pedido de aula",
    template: "buildBookingAcceptedEmail",
    cta: "Ver minha aula / Conversar com o professor",
    idempotencyKey: bookingKey(EMAIL_EVENTS.BOOKING_ACCEPTED, "{bookingId}", "{studentId}"),
  },
  {
    event: EMAIL_EVENTS.PAYMENT_REQUIRED,
    trigger: "Pedido aceito com valor pendente",
    recipient: "Aluno",
    subject: "Finalize o pagamento da sua aula",
    template: "buildPaymentRequiredEmail",
    cta: "Pagar agora",
    idempotencyKey: bookingKey(EMAIL_EVENTS.PAYMENT_REQUIRED, "{bookingId}", "{studentId}"),
  },
  {
    event: EMAIL_EVENTS.NEW_MESSAGE,
    trigger: "Nova mensagem na conversa",
    recipient: "Participante destinatário",
    subject: "Você recebeu uma nova mensagem de {senderName}",
    template: "buildNewMessageEmail",
    cta: "Responder na AprendizBay",
    idempotencyKey: buildNewMessageEventKey("{messageId}", "{recipientUserId}"),
  },
  {
    event: EMAIL_EVENTS.PAYMENT_CONFIRMED,
    trigger: "Pagamento confirmado",
    recipient: "Aluno",
    subject: "Pagamento confirmado",
    template: "buildPaymentConfirmedEmail",
    cta: "Ver comprovante",
    idempotencyKey: bookingKey(EMAIL_EVENTS.PAYMENT_CONFIRMED, "{bookingId}", "{studentId}"),
  },
  {
    event: EMAIL_EVENTS.LESSON_CONFIRMED,
    trigger: "Pagamento confirmado / aula agendada",
    recipient: "Aluno e professor",
    subject: "Sua aula está confirmada / Aula confirmada com {aluno}",
    template: "buildLessonConfirmedEmail",
    cta: "Ver minha aula / Ver aula no painel",
    idempotencyKey: bookingKey(EMAIL_EVENTS.LESSON_CONFIRMED, "{bookingId}", "{participantId}"),
  },
  {
    event: EMAIL_EVENTS.TUTOR_PAYMENT_RECEIVED,
    trigger: "Pagamento do aluno confirmado",
    recipient: "Professor",
    subject: "Pagamento confirmado — aula com {aluno}",
    template: "buildTutorPaymentReceivedEmail",
    cta: "Ver aula no painel",
    idempotencyKey: bookingKey(EMAIL_EVENTS.TUTOR_PAYMENT_RECEIVED, "{bookingId}", "{tutorId}"),
  },
  {
    event: EMAIL_EVENTS.LESSON_REMINDER,
    trigger: "Cron de lembretes (24h ou 1h antes)",
    recipient: "Aluno e professor",
    subject: "Lembrete: sua aula é amanhã / começa em 1 hora",
    template: "buildLessonReminderEmail",
    cta: "Link da aula (quando disponível)",
    idempotencyKey: buildLessonReminderEventKey("{bookingId}", "{recipientUserId}", "one_hour"),
  },
  {
    event: EMAIL_EVENTS.LESSON_COMPLETED,
    trigger: "Aula marcada como concluída",
    recipient: "Aluno e professor",
    subject: "Aula concluída",
    template: "buildLessonCompletedEmail",
    cta: "Ver minhas aulas",
    idempotencyKey: bookingKey(EMAIL_EVENTS.LESSON_COMPLETED, "{bookingId}", "{participantId}"),
  },
  {
    event: EMAIL_EVENTS.REVIEW_REQUEST,
    trigger: "Aula concluída",
    recipient: "Aluno",
    subject: "Como foi sua aula?",
    template: "buildReviewRequestEmail",
    cta: "Avaliar professor",
    idempotencyKey: bookingKey(EMAIL_EVENTS.REVIEW_REQUEST, "{bookingId}", "{studentId}"),
  },
  {
    event: EMAIL_EVENTS.LESSON_CANCELLED,
    trigger: "Cancelamento da aula",
    recipient: "Aluno e professor",
    subject: "Aula cancelada",
    template: "buildLessonCancelledEmail",
    cta: "Ver minhas aulas",
    idempotencyKey: bookingKey(EMAIL_EVENTS.LESSON_CANCELLED, "{bookingId}", "{participantId}"),
  },
  {
    event: EMAIL_EVENTS.REFUND_COMPLETED,
    trigger: "Estorno confirmado",
    recipient: "Aluno",
    subject: "Estorno confirmado",
    template: "buildRefundCompletedEmail",
    cta: "Ver minhas aulas",
    idempotencyKey: bookingKey(EMAIL_EVENTS.REFUND_COMPLETED, "{bookingId}", "{studentId}"),
  },
  {
    event: EMAIL_EVENTS.PAYMENT_FAILED,
    trigger: "Falha no pagamento",
    recipient: "Aluno",
    subject: "Pagamento não confirmado",
    template: "buildPaymentFailedEmail",
    cta: "Tentar pagamento novamente",
    idempotencyKey: bookingKey(EMAIL_EVENTS.PAYMENT_FAILED, "{bookingId}", "{studentId}"),
  },
  {
    event: EMAIL_EVENTS.NEW_REVIEW,
    trigger: "Aluno publica avaliação",
    recipient: "Professor",
    subject: "Você recebeu uma nova avaliação",
    template: "buildNewReviewEmail",
    cta: "Abrir meu painel",
    idempotencyKey: buildNewReviewEventKey("{reviewId}", "{tutorId}"),
  },
  {
    event: EMAIL_EVENTS.TUTOR_PROFILE_INCOMPLETE,
    trigger: "Professor criou conta sem perfil completo",
    recipient: "Professor",
    subject: "Complete seu perfil de professor",
    template: "buildTutorProfileIncompleteEmail",
    cta: "Completar perfil",
    idempotencyKey: buildTutorLifecycleEventKey(EMAIL_EVENTS.TUTOR_PROFILE_INCOMPLETE, "{tutorId}"),
  },
  {
    event: EMAIL_EVENTS.TUTOR_VERIFICATION_SUBMITTED,
    trigger: "Professor envia documentos",
    recipient: "Professor",
    subject: "Documentos enviados para análise",
    template: "buildTutorVerificationSubmittedEmail",
    cta: "Acompanhar status",
    idempotencyKey: buildTutorLifecycleEventKey(
      EMAIL_EVENTS.TUTOR_VERIFICATION_SUBMITTED,
      "{tutorId}",
    ),
  },
  {
    event: EMAIL_EVENTS.TUTOR_VERIFICATION_APPROVED,
    trigger: "Admin aprova verificação",
    recipient: "Professor",
    subject: "Seu perfil foi aprovado",
    template: "buildTutorVerificationApprovedEmail",
    cta: "Abrir meu painel",
    idempotencyKey: buildTutorLifecycleEventKey(
      EMAIL_EVENTS.TUTOR_VERIFICATION_APPROVED,
      "{tutorId}",
    ),
  },
  {
    event: EMAIL_EVENTS.TUTOR_PROFILE_PUBLISHED,
    trigger: "Perfil aprovado e visível no marketplace",
    recipient: "Professor",
    subject: "Seu perfil já está no marketplace",
    template: "buildTutorProfilePublishedEmail",
    cta: "Ver meu perfil público",
    idempotencyKey: buildTutorLifecycleEventKey(EMAIL_EVENTS.TUTOR_PROFILE_PUBLISHED, "{tutorId}"),
  },
];

export function isTransactionalEmailEvent(event: string): event is EmailEventName {
  return Object.values(EMAIL_EVENTS).includes(event as EmailEventName);
}
