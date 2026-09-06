import { EMAIL_EVENTS, type EmailEventName } from "@/lib/email/events";
import { EMAIL_HTML_LANG } from "@/lib/email/locale";
import { previewMessage } from "@/lib/conversations/ids";
import {
  buildBookingRequestedEmail,
  buildEmailVerificationEmail,
  buildLessonConfirmedEmail,
  buildPaymentRequiredEmail,
  buildTutorPaymentReceivedEmail,
  buildTutorProfileIncompleteEmail,
  buildTutorProfilePublishedEmail,
  buildTutorVerificationApprovedEmail,
  buildTutorVerificationSubmittedEmail,
} from "@/lib/email/lifecycle-templates";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type BookingStatus,
  type PaymentStatus,
} from "@/lib/bookings/types";

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

export function firstDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "Olá";
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function formatBookingAcceptedStatusLabel(
  status?: string,
  paymentStatus?: string,
): string {
  if (paymentStatus === "awaiting_payment") {
    return "Pedido aceito — aguardando pagamento";
  }
  if (paymentStatus && paymentStatus in PAYMENT_STATUS_LABELS) {
    return PAYMENT_STATUS_LABELS[paymentStatus as PaymentStatus];
  }
  if (status && status in BOOKING_STATUS_LABELS) {
    return BOOKING_STATUS_LABELS[status as BookingStatus];
  }
  return "Pedido aceito";
}

function emailFooterHtml(): string {
  return `<tr>
      <td style="padding-top:24px;border-top:1px solid #e2e8f0">
        <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#64748b">
          Você recebeu este e-mail porque usa a plataforma <strong style="color:#0f172a">Aprendiz Bay</strong>.
        </p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8">
          Marketplace de aulas particulares · aprendizbay.com.br
        </p>
      </td>
    </tr>`;
}

function emailFooterText(): string {
  return "—\nAprendiz Bay · Marketplace de aulas particulares\naprendizbay.com.br";
}

export function renderEmailButton(label: string, href: string, variant: "primary" | "secondary" = "primary"): string {
  const background = variant === "primary" ? "#059669" : "#ffffff";
  const color = variant === "primary" ? "#ffffff" : "#059669";
  const border = variant === "primary" ? "1px solid #059669" : "1px solid #059669";

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 12px 12px 0;display:inline-block;max-width:100%">
    <tr>
      <td style="border-radius:12px;background:${background};border:${border}">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:${color};text-decoration:none;line-height:1.2">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function wrapEmail(title: string, bodyHtml: string, bodyText: string): EmailContent {
  return {
    subject: title,
    text: `${title}\n\n${bodyText}\n\n${emailFooterText()}`,
    html: `<!doctype html>
<html lang="${escapeHtml(EMAIL_HTML_LANG)}">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px 24px;border:1px solid #e2e8f0">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#059669">Aprendiz Bay</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;font-weight:700">${escapeHtml(title)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            ${emailFooterHtml()}
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
  actionUrl?: string;
}

export function buildUserRegisteredEmail(input: UserRegisteredTemplateInput): EmailContent {
  const firstName = firstDisplayName(input.displayName);
  const isTutor = input.roleLabel === "professor";
  const title = isTutor
    ? "Bem-vindo(a) ao Aprendiz Bay, professor!"
    : "Bem-vindo(a) ao Aprendiz Bay";
  const exploreLabel = isTutor ? "Completar meu perfil" : "Explorar a plataforma";
  const exploreUrl = input.actionUrl ?? input.bookingsUrl;

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Sua conta de <strong>${escapeHtml(input.roleLabel)}</strong> foi criada com sucesso na Aprendiz Bay.</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">${isTutor ? "Complete seu perfil para começar a receber pedidos de aula." : "Explore professores, agende aulas e acompanhe tudo em um só lugar."}</p>
     ${exploreUrl ? `<div style="margin:8px 0 4px">${renderEmailButton(exploreLabel, exploreUrl, "primary")}</div>` : ""}`,
    `Olá, ${firstName}!\n\nSua conta de ${input.roleLabel} foi criada com sucesso na Aprendiz Bay.\n${isTutor ? "Complete seu perfil para começar a receber pedidos de aula." : "Explore professores, agende aulas e acompanhe tudo em um só lugar."}${exploreUrl ? `\n${exploreLabel}: ${exploreUrl}` : ""}`,
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
  subjectLabel?: string;
  bookingType?: string;
  scheduledAt: Date | string;
  statusLabel: string;
  priceLabel?: string;
  bookingUrl?: string;
  messagesUrl?: string;
  bookingsUrl?: string;
}

export function buildBookingAcceptedEmail(input: BookingAcceptedTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const firstName = firstDisplayName(input.studentName);
  const subject = `${input.tutorName} aceitou seu pedido de aula`;
  const subjectLine = input.subjectLabel?.trim() || "Matéria a combinar";

  const detailsHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
    <tr>
      <td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#334155">
        <p style="margin:0 0 8px"><strong style="color:#0f172a">Matéria:</strong> ${escapeHtml(subjectLine)}</p>
        <p style="margin:0 0 8px"><strong style="color:#0f172a">Tipo de aula:</strong> ${escapeHtml(typeLabel)}</p>
        <p style="margin:0 0 8px"><strong style="color:#0f172a">Data e horário:</strong> ${escapeHtml(when)}</p>
        <p style="margin:0 0 8px"><strong style="color:#0f172a">Status:</strong> ${escapeHtml(input.statusLabel)}</p>
        ${input.priceLabel ? `<p style="margin:0"><strong style="color:#0f172a">Valor:</strong> ${escapeHtml(input.priceLabel)}</p>` : ""}
      </td>
    </tr>
  </table>`;

  const buttonsHtml = [
    input.bookingUrl ? renderEmailButton("Ver minha aula", input.bookingUrl, "primary") : "",
    input.messagesUrl
      ? renderEmailButton("Conversar com o professor", input.messagesUrl, "secondary")
      : "",
  ]
    .filter(Boolean)
    .join("");

  const nextStepHtml = input.priceLabel
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Quando estiver pronta, finalize o pagamento para garantir sua vaga. Se quiser combinar detalhes antes, converse com <strong>${escapeHtml(input.tutorName)}</strong> pela Aprendiz Bay — sem precisar compartilhar telefone ou e-mail pessoal.</p>`
    : `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Agora você pode conversar com <strong>${escapeHtml(input.tutorName)}</strong> pela Aprendiz Bay para combinar os detalhes da sua aula.</p>`;

  const bodyHtml = `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155"><strong>${escapeHtml(input.tutorName)}</strong> aceitou seu pedido de aula. Que ótima notícia!</p>
     ${nextStepHtml}
     ${detailsHtml}
     ${buttonsHtml ? `<div style="margin:8px 0 4px">${buttonsHtml}</div>` : ""}
     ${input.bookingsUrl ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#64748b">Você também pode acompanhar tudo em <a href="${escapeHtml(input.bookingsUrl)}" style="color:#059669;text-decoration:underline">Minhas aulas</a>.</p>` : ""}`;

  const textLines = [
    `Olá, ${firstName}!`,
    "",
    `${input.tutorName} aceitou seu pedido de aula.`,
    "",
    input.priceLabel
      ? `Quando estiver pronta, finalize o pagamento para garantir sua vaga. Se quiser combinar detalhes antes, converse com ${input.tutorName} pela Aprendiz Bay.`
      : `Agora você pode conversar com ${input.tutorName} pela Aprendiz Bay para combinar os detalhes da sua aula.`,
    "",
    `Matéria: ${subjectLine}`,
    `Tipo de aula: ${typeLabel}`,
    `Data e horário: ${when}`,
    `Status: ${input.statusLabel}`,
    input.priceLabel ? `Valor: ${input.priceLabel}` : "",
    "",
    input.bookingUrl ? `Ver minha aula: ${input.bookingUrl}` : "",
    input.messagesUrl ? `Conversar com o professor: ${input.messagesUrl}` : "",
    input.bookingsUrl ? `Minhas aulas: ${input.bookingsUrl}` : "",
  ].filter(Boolean);

  return wrapEmail(subject, bodyHtml, textLines.join("\n"));
}

export interface PaymentConfirmedTemplateInput {
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  amountLabel?: string;
  meetingUrl?: string;
  bookingsUrl?: string;
}

export function buildPaymentConfirmedEmail(input: PaymentConfirmedTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const firstName = firstDisplayName(input.studentName);
  const title = "Pagamento confirmado";

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Recebemos o pagamento da sua aula <strong>${escapeHtml(typeLabel)}</strong> com <strong>${escapeHtml(input.tutorName)}</strong>.</p>
     <p style="margin:0 0 8px"><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.amountLabel ? `<p style="margin:0 0 16px"><strong>Valor:</strong> ${escapeHtml(input.amountLabel)}</p>` : ""}
     ${input.bookingsUrl ? `<div style="margin:8px 0 4px">${renderEmailButton("Ver comprovante", input.bookingsUrl, "primary")}</div>` : ""}`,
    `Olá, ${firstName}!\n\nRecebemos o pagamento da sua aula ${typeLabel} com ${input.tutorName}.\nQuando: ${when}${input.amountLabel ? `\nValor: ${input.amountLabel}` : ""}${input.bookingsUrl ? `\nVer comprovante: ${input.bookingsUrl}` : ""}`,
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
  reminderType?: "one_hour" | "twenty_four_hour";
}

export function buildLessonReminderEmail(input: LessonReminderTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const isTwentyFourHour = input.reminderType === "twenty_four_hour";
  const title = isTwentyFourHour
    ? "Lembrete: sua aula é amanhã"
    : "Lembrete: sua aula começa em 1 hora";
  const timingCopy = isTwentyFourHour
    ? "acontece amanhã"
    : "começa em cerca de 1 hora";

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstDisplayName(input.recipientName))}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">A aula <strong>${escapeHtml(typeLabel)}</strong> entre <strong>${escapeHtml(input.studentName)}</strong> e <strong>${escapeHtml(input.tutorName)}</strong> ${timingCopy}.</p>
     <p style="margin:0 0 8px"><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.meetingUrl ? `<p style="margin:0 0 16px"><strong>Link da aula:</strong> <a href="${escapeHtml(input.meetingUrl)}" style="color:#059669">${escapeHtml(input.meetingUrl)}</a></p>` : ""}`,
    `Olá, ${firstDisplayName(input.recipientName)}!\n\nA aula ${typeLabel} entre ${input.studentName} e ${input.tutorName} ${timingCopy}.\nQuando: ${when}${input.meetingUrl ? `\nLink da aula: ${input.meetingUrl}` : ""}`,
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
  lessonContextLabel?: string;
  messagesUrl?: string;
}

export function buildNewMessageEmail(input: NewMessageTemplateInput): EmailContent {
  const subject = `Você recebeu uma nova mensagem de ${input.senderName}`;
  const firstName = firstDisplayName(input.recipientName);
  const preview = previewMessage(input.preview, 180);

  const lessonContextHtml = input.lessonContextLabel
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#64748b"><strong style="color:#0f172a">Contexto da aula:</strong> ${escapeHtml(input.lessonContextLabel)}</p>`
    : "";

  const buttonHtml = input.messagesUrl
    ? `<div style="margin:8px 0 4px">${renderEmailButton("Responder na AprendizBay", input.messagesUrl, "primary")}</div>`
    : "";

  const bodyHtml = `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155"><strong>${escapeHtml(input.senderName)}</strong> enviou uma nova mensagem para você na Aprendiz Bay.</p>
     ${lessonContextHtml}
     <blockquote style="margin:0 0 20px;padding:14px 16px;background:#f8fafc;border-left:4px solid #059669;border-radius:0 12px 12px 0;font-size:14px;line-height:1.7;color:#334155">${escapeHtml(preview)}</blockquote>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#64748b">Para responder com segurança, use a mensageria da Aprendiz Bay. Não compartilhamos telefone, e-mail ou endereço dos participantes por aqui.</p>
     ${buttonHtml}`;

  const textLines = [
    `Olá, ${firstName}!`,
    "",
    `${input.senderName} enviou uma nova mensagem para você na Aprendiz Bay.`,
    "",
    input.lessonContextLabel ? `Contexto da aula: ${input.lessonContextLabel}` : "",
    "",
    `"${preview}"`,
    "",
    "Para responder com segurança, use a mensageria da Aprendiz Bay.",
    input.messagesUrl ? `Responder na AprendizBay: ${input.messagesUrl}` : "",
  ].filter(Boolean);

  return wrapEmail(subject, bodyHtml, textLines.join("\n"));
}

const TEMPLATE_BUILDERS = {
  [EMAIL_EVENTS.USER_REGISTERED]: buildUserRegisteredEmail,
  [EMAIL_EVENTS.EMAIL_VERIFICATION]: buildEmailVerificationEmail,
  [EMAIL_EVENTS.BOOKING_REQUESTED]: buildBookingRequestedEmail,
  [EMAIL_EVENTS.BOOKING_CREATED]: buildBookingCreatedEmail,
  [EMAIL_EVENTS.BOOKING_ACCEPTED]: buildBookingAcceptedEmail,
  [EMAIL_EVENTS.PAYMENT_REQUIRED]: buildPaymentRequiredEmail,
  [EMAIL_EVENTS.PAYMENT_CONFIRMED]: buildPaymentConfirmedEmail,
  [EMAIL_EVENTS.PAYMENT_FAILED]: buildPaymentFailedEmail,
  [EMAIL_EVENTS.LESSON_CONFIRMED]: buildLessonConfirmedEmail,
  [EMAIL_EVENTS.LESSON_REMINDER]: buildLessonReminderEmail,
  [EMAIL_EVENTS.LESSON_CANCELLED]: buildLessonCancelledEmail,
  [EMAIL_EVENTS.REFUND_COMPLETED]: buildRefundCompletedEmail,
  [EMAIL_EVENTS.LESSON_COMPLETED]: buildLessonCompletedEmail,
  [EMAIL_EVENTS.REVIEW_REQUEST]: buildReviewRequestEmail,
  [EMAIL_EVENTS.NEW_MESSAGE]: buildNewMessageEmail,
  [EMAIL_EVENTS.NEW_REVIEW]: buildNewReviewEmail,
  [EMAIL_EVENTS.TUTOR_PROFILE_INCOMPLETE]: buildTutorProfileIncompleteEmail,
  [EMAIL_EVENTS.TUTOR_VERIFICATION_SUBMITTED]: buildTutorVerificationSubmittedEmail,
  [EMAIL_EVENTS.TUTOR_VERIFICATION_APPROVED]: buildTutorVerificationApprovedEmail,
  [EMAIL_EVENTS.TUTOR_PROFILE_PUBLISHED]: buildTutorProfilePublishedEmail,
  [EMAIL_EVENTS.TUTOR_PAYMENT_RECEIVED]: buildTutorPaymentReceivedEmail,
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
