import { EMAIL_EVENTS, type EmailEventName } from "@/lib/email/events";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const BOOKING_TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  coletivo: "Coletiva",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDatePtBr(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "data a confirmar";
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export function bookingTypeLabel(type?: string): string {
  return BOOKING_TYPE_LABELS[type ?? ""] || "Aula";
}

function wrapEmail(title: string, bodyHtml: string, bodyText: string): EmailContent {
  return {
    subject: title,
    text: `${title}\n\n${bodyText}\n\n— Aprendiz Bay`,
    html: `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f8fafb;font-family:system-ui,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e2e8f0">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#059669">Aprendiz Bay</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escapeHtml(title)}</h1>
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

export interface UserRegisteredTemplateInput {
  displayName: string;
  roleLabel: string;
  bookingsUrl?: string;
}

export function buildUserRegisteredEmail(input: UserRegisteredTemplateInput): EmailContent {
  const title = "Bem-vindo(a) ao Aprendiz Bay";
  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.displayName)}!</p>
     <p>Sua conta de <strong>${escapeHtml(input.roleLabel)}</strong> foi criada com sucesso.</p>
     <p>Explore professores, agende aulas e acompanhe tudo em um só lugar.</p>
     ${input.bookingsUrl ? `<p><a href="${escapeHtml(input.bookingsUrl)}" style="color:#059669">Explorar a plataforma</a></p>` : ""}`,
    `Olá, ${input.displayName}!\n\nSua conta de ${input.roleLabel} foi criada com sucesso.\nExplore professores, agende aulas e acompanhe tudo em um só lugar.${input.bookingsUrl ? `\n${input.bookingsUrl}` : ""}`,
  );
}

export interface BookingCreatedTemplateInput {
  tutorName: string;
  studentName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  dashboardUrl?: string;
}

export function buildBookingCreatedEmail(input: BookingCreatedTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Nova reserva pendente no Aprendiz Bay";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.tutorName)}!</p>
     <p><strong>${escapeHtml(input.studentName)}</strong> solicitou uma aula <strong>${escapeHtml(typeLabel)}</strong>.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     <p>Acesse o painel para confirmar ou recusar a reserva.</p>
     ${input.dashboardUrl ? `<p><a href="${escapeHtml(input.dashboardUrl)}" style="color:#059669">Abrir meu painel</a></p>` : ""}`,
    `Olá, ${input.tutorName}!\n\n${input.studentName} solicitou uma aula ${typeLabel}.\nQuando: ${when}\n\nAcesse o painel para confirmar ou recusar a reserva.${input.dashboardUrl ? `\n${input.dashboardUrl}` : ""}`,
  );
}

export interface BookingAcceptedTemplateInput {
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  priceLabel?: string;
  bookingsUrl?: string;
}

export function buildBookingAcceptedEmail(input: BookingAcceptedTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "O professor confirmou sua aula";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.studentName)}!</p>
     <p><strong>${escapeHtml(input.tutorName)}</strong> confirmou sua aula <strong>${escapeHtml(typeLabel)}</strong>.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.priceLabel ? `<p><strong>Valor:</strong> ${escapeHtml(input.priceLabel)}</p>` : ""}
     <p>Agora você já pode pagar para liberar a aula.</p>
     ${input.bookingsUrl ? `<p><a href="${escapeHtml(input.bookingsUrl)}" style="color:#059669">Pagar e ver minhas aulas</a></p>` : ""}`,
    `Olá, ${input.studentName}!\n\n${input.tutorName} confirmou sua aula ${typeLabel}.\nQuando: ${when}${input.priceLabel ? `\nValor: ${input.priceLabel}` : ""}\n\nAgora você já pode pagar para liberar a aula.${input.bookingsUrl ? `\n${input.bookingsUrl}` : ""}`,
  );
}

export interface PaymentConfirmedTemplateInput {
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  meetingUrl?: string;
  bookingsUrl?: string;
}

export function buildPaymentConfirmedEmail(input: PaymentConfirmedTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Sua aula foi confirmada";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.studentName)}!</p>
     <p>Sua aula <strong>${escapeHtml(typeLabel)}</strong> com <strong>${escapeHtml(input.tutorName)}</strong> está confirmada.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.meetingUrl ? `<p><strong>Link da aula:</strong> <a href="${escapeHtml(input.meetingUrl)}" style="color:#059669">${escapeHtml(input.meetingUrl)}</a></p>` : "<p>O link da aula estará disponível em Minhas aulas.</p>"}
     ${input.bookingsUrl ? `<p><a href="${escapeHtml(input.bookingsUrl)}" style="color:#059669">Ver minhas aulas</a></p>` : ""}`,
    `Olá, ${input.studentName}!\n\nSua aula ${typeLabel} com ${input.tutorName} está confirmada.\nQuando: ${when}\n${input.meetingUrl ? `Link da aula: ${input.meetingUrl}` : "O link da aula estará disponível em Minhas aulas."}${input.bookingsUrl ? `\n${input.bookingsUrl}` : ""}`,
  );
}

export interface PaymentFailedTemplateInput {
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  bookingsUrl?: string;
}

export function buildPaymentFailedEmail(input: PaymentFailedTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Pagamento não confirmado";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.studentName)}!</p>
     <p>O pagamento da sua aula <strong>${escapeHtml(typeLabel)}</strong> com <strong>${escapeHtml(input.tutorName)}</strong> não foi confirmado.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     <p>Nenhum valor foi confirmado e a aula ainda não foi liberada. Você pode tentar pagar novamente em Minhas aulas.</p>
     ${input.bookingsUrl ? `<p><a href="${escapeHtml(input.bookingsUrl)}" style="color:#059669">Tentar pagamento novamente</a></p>` : ""}`,
    `Olá, ${input.studentName}!\n\nO pagamento da sua aula ${typeLabel} com ${input.tutorName} não foi confirmado.\nQuando: ${when}\n\nNenhum valor foi confirmado e a aula ainda não foi liberada.${input.bookingsUrl ? `\n${input.bookingsUrl}` : ""}`,
  );
}

export interface LessonReminderTemplateInput {
  recipientName: string;
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  meetingUrl?: string;
}

export function buildLessonReminderEmail(input: LessonReminderTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Lembrete: sua aula começa em 1 hora";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.recipientName)}!</p>
     <p>A aula <strong>${escapeHtml(typeLabel)}</strong> entre <strong>${escapeHtml(input.studentName)}</strong> e <strong>${escapeHtml(input.tutorName)}</strong> começa em cerca de 1 hora.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.meetingUrl ? `<p><strong>Link da aula:</strong> <a href="${escapeHtml(input.meetingUrl)}" style="color:#059669">${escapeHtml(input.meetingUrl)}</a></p>` : ""}`,
    `Olá, ${input.recipientName}!\n\nA aula ${typeLabel} entre ${input.studentName} e ${input.tutorName} começa em cerca de 1 hora.\nQuando: ${when}${input.meetingUrl ? `\nLink da aula: ${input.meetingUrl}` : ""}`,
  );
}

export interface LessonCancelledTemplateInput {
  recipientName: string;
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  cancelledByLabel: string;
  bookingsUrl?: string;
}

export function buildLessonCancelledEmail(input: LessonCancelledTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Aula cancelada";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.recipientName)}!</p>
     <p>A aula <strong>${escapeHtml(typeLabel)}</strong> entre <strong>${escapeHtml(input.studentName)}</strong> e <strong>${escapeHtml(input.tutorName)}</strong> foi cancelada.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     <p><strong>Cancelada por:</strong> ${escapeHtml(input.cancelledByLabel)}</p>
     ${input.bookingsUrl ? `<p><a href="${escapeHtml(input.bookingsUrl)}" style="color:#059669">Ver minhas aulas</a></p>` : ""}`,
    `Olá, ${input.recipientName}!\n\nA aula ${typeLabel} entre ${input.studentName} e ${input.tutorName} foi cancelada.\nQuando: ${when}\nCancelada por: ${input.cancelledByLabel}${input.bookingsUrl ? `\n${input.bookingsUrl}` : ""}`,
  );
}

export interface RefundCompletedTemplateInput {
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  refundAmountLabel?: string;
  bookingsUrl?: string;
}

export function buildRefundCompletedEmail(input: RefundCompletedTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Estorno confirmado";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.studentName)}!</p>
     <p>O estorno da sua aula <strong>${escapeHtml(typeLabel)}</strong> com <strong>${escapeHtml(input.tutorName)}</strong> foi confirmado.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.refundAmountLabel ? `<p><strong>Valor estornado:</strong> ${escapeHtml(input.refundAmountLabel)}</p>` : ""}
     <p>O prazo para o valor aparecer na sua fatura depende do meio de pagamento.</p>
     ${input.bookingsUrl ? `<p><a href="${escapeHtml(input.bookingsUrl)}" style="color:#059669">Ver minhas aulas</a></p>` : ""}`,
    `Olá, ${input.studentName}!\n\nO estorno da sua aula ${typeLabel} com ${input.tutorName} foi confirmado.\nQuando: ${when}${input.refundAmountLabel ? `\nValor estornado: ${input.refundAmountLabel}` : ""}\n\nO prazo para o valor aparecer na sua fatura depende do meio de pagamento.${input.bookingsUrl ? `\n${input.bookingsUrl}` : ""}`,
  );
}

export interface LessonCompletedTemplateInput {
  recipientName: string;
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  bookingsUrl?: string;
}

export function buildLessonCompletedEmail(input: LessonCompletedTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Aula concluída";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.recipientName)}!</p>
     <p>A aula <strong>${escapeHtml(typeLabel)}</strong> entre <strong>${escapeHtml(input.studentName)}</strong> e <strong>${escapeHtml(input.tutorName)}</strong> foi marcada como concluída.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.bookingsUrl ? `<p><a href="${escapeHtml(input.bookingsUrl)}" style="color:#059669">Ver minhas aulas</a></p>` : ""}`,
    `Olá, ${input.recipientName}!\n\nA aula ${typeLabel} entre ${input.studentName} e ${input.tutorName} foi marcada como concluída.\nQuando: ${when}${input.bookingsUrl ? `\n${input.bookingsUrl}` : ""}`,
  );
}

export interface ReviewRequestTemplateInput {
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  reviewUrl?: string;
}

export function buildReviewRequestEmail(input: ReviewRequestTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Como foi sua aula?";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.studentName)}!</p>
     <p>Sua aula <strong>${escapeHtml(typeLabel)}</strong> com <strong>${escapeHtml(input.tutorName)}</strong> foi concluída.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     <p>Conte como foi a experiência e ajude outros alunos a escolherem um professor.</p>
     ${input.reviewUrl ? `<p><a href="${escapeHtml(input.reviewUrl)}" style="color:#059669">Avaliar professor</a></p>` : ""}`,
    `Olá, ${input.studentName}!\n\nSua aula ${typeLabel} com ${input.tutorName} foi concluída.\nQuando: ${when}\n\nConte como foi a experiência e ajude outros alunos a escolherem um professor.${input.reviewUrl ? `\n${input.reviewUrl}` : ""}`,
  );
}

export interface NewReviewTemplateInput {
  tutorName: string;
  studentName: string;
  rating: number;
  comment?: string;
  dashboardUrl?: string;
}

export function buildNewReviewEmail(input: NewReviewTemplateInput): EmailContent {
  const stars = "★".repeat(Math.max(1, Math.min(5, Number(input.rating) || 0)));
  const title = "Você recebeu uma nova avaliação";
  const comment = String(input.comment || "").trim();

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.tutorName)}!</p>
     <p><strong>${escapeHtml(input.studentName)}</strong> deixou uma avaliação da aula.</p>
     <p><strong>Nota:</strong> ${escapeHtml(String(input.rating))} ${escapeHtml(stars)}</p>
     ${comment ? `<p><strong>Comentário:</strong> ${escapeHtml(comment)}</p>` : ""}
     ${input.dashboardUrl ? `<p><a href="${escapeHtml(input.dashboardUrl)}" style="color:#059669">Abrir meu painel</a></p>` : ""}`,
    `Olá, ${input.tutorName}!\n\n${input.studentName} deixou uma avaliação da aula.\nNota: ${input.rating} ${stars}${comment ? `\nComentário: ${comment}` : ""}${input.dashboardUrl ? `\n${input.dashboardUrl}` : ""}`,
  );
}

export interface NewMessageTemplateInput {
  recipientName: string;
  senderName: string;
  preview: string;
  messagesUrl?: string;
}

export function buildNewMessageEmail(input: NewMessageTemplateInput): EmailContent {
  const title = "Nova mensagem no Aprendiz Bay";
  const preview = input.preview.trim().slice(0, 180);

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.recipientName)}!</p>
     <p><strong>${escapeHtml(input.senderName)}</strong> enviou uma nova mensagem:</p>
     <p style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-radius:12px">${escapeHtml(preview)}</p>
     ${input.messagesUrl ? `<p><a href="${escapeHtml(input.messagesUrl)}" style="color:#059669">Responder no Aprendiz Bay</a></p>` : ""}`,
    `Olá, ${input.recipientName}!\n\n${input.senderName} enviou uma nova mensagem:\n${preview}${input.messagesUrl ? `\n${input.messagesUrl}` : ""}`,
  );
}

const TEMPLATE_BUILDERS = {
  [EMAIL_EVENTS.USER_REGISTERED]: buildUserRegisteredEmail,
  [EMAIL_EVENTS.BOOKING_CREATED]: buildBookingCreatedEmail,
  [EMAIL_EVENTS.BOOKING_ACCEPTED]: buildBookingAcceptedEmail,
  [EMAIL_EVENTS.PAYMENT_CONFIRMED]: buildPaymentConfirmedEmail,
  [EMAIL_EVENTS.PAYMENT_FAILED]: buildPaymentFailedEmail,
  [EMAIL_EVENTS.LESSON_REMINDER]: buildLessonReminderEmail,
  [EMAIL_EVENTS.LESSON_CANCELLED]: buildLessonCancelledEmail,
  [EMAIL_EVENTS.REFUND_COMPLETED]: buildRefundCompletedEmail,
  [EMAIL_EVENTS.LESSON_COMPLETED]: buildLessonCompletedEmail,
  [EMAIL_EVENTS.REVIEW_REQUEST]: buildReviewRequestEmail,
  [EMAIL_EVENTS.NEW_MESSAGE]: buildNewMessageEmail,
} as const;

export function buildEmailTemplate<T extends EmailEventName>(
  eventName: T,
  input: Parameters<(typeof TEMPLATE_BUILDERS)[T]>[0],
): EmailContent {
  const builder = TEMPLATE_BUILDERS[eventName] as (value: typeof input) => EmailContent;
  return builder(input);
}

// Backward-compatible aliases used by legacy notification code/tests.
export const buildPendingBookingEmail = buildBookingCreatedEmail;
export const buildConfirmedBookingEmail = buildPaymentConfirmedEmail;
