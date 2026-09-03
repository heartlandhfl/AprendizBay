import type { EmailContent } from "@/lib/email/templates";
import {
  bookingTypeLabel,
  escapeHtml,
  firstDisplayName,
  formatDatePtBr,
  renderEmailButton,
  wrapEmail,
} from "@/lib/email/templates";

export interface EmailVerificationTemplateInput {
  displayName: string;
  verificationUrl: string;
}

export function buildEmailVerificationEmail(input: EmailVerificationTemplateInput): EmailContent {
  const title = "Confirme seu e-mail no Aprendiz Bay";
  const firstName = firstDisplayName(input.displayName);

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Para proteger sua conta e receber atualizações importantes sobre suas aulas, confirme seu e-mail.</p>
     <div style="margin:8px 0 4px">${renderEmailButton("Confirmar e-mail", input.verificationUrl, "primary")}</div>`,
    `Olá, ${firstName}!\n\nPara proteger sua conta e receber atualizações importantes sobre suas aulas, confirme seu e-mail.\nConfirmar e-mail: ${input.verificationUrl}`,
  );
}

export interface BookingRequestedTemplateInput {
  studentName: string;
  tutorName: string;
  subjectLabel?: string;
  bookingType?: string;
  scheduledAt: Date | string;
  bookingsUrl?: string;
}

export function buildBookingRequestedEmail(input: BookingRequestedTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const firstName = firstDisplayName(input.studentName);
  const subject = "Recebemos seu pedido de aula";
  const subjectLine = input.subjectLabel?.trim() || "Matéria a combinar";

  return wrapEmail(
    subject,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Enviamos seu pedido de aula para <strong>${escapeHtml(input.tutorName)}</strong>. Assim que o professor responder, avisaremos você por aqui.</p>
     <p style="margin:0 0 8px"><strong>Matéria:</strong> ${escapeHtml(subjectLine)}</p>
     <p style="margin:0 0 8px"><strong>Tipo:</strong> ${escapeHtml(typeLabel)}</p>
     <p style="margin:0 0 16px"><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.bookingsUrl ? `<div style="margin:8px 0 4px">${renderEmailButton("Acompanhar pedido", input.bookingsUrl, "primary")}</div>` : ""}`,
    `Olá, ${firstName}!\n\nEnviamos seu pedido de aula para ${input.tutorName}.\nMatéria: ${subjectLine}\nTipo: ${typeLabel}\nQuando: ${when}${input.bookingsUrl ? `\nAcompanhar pedido: ${input.bookingsUrl}` : ""}`,
  );
}

export interface PaymentRequiredTemplateInput {
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  priceLabel?: string;
  paymentUrl?: string;
}

export function buildPaymentRequiredEmail(input: PaymentRequiredTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const firstName = firstDisplayName(input.studentName);
  const title = "Finalize o pagamento da sua aula";

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155"><strong>${escapeHtml(input.tutorName)}</strong> aceitou sua aula. Agora falta apenas o pagamento para garantir sua vaga.</p>
     <p style="margin:0 0 8px"><strong>Tipo:</strong> ${escapeHtml(typeLabel)}</p>
     <p style="margin:0 0 8px"><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.priceLabel ? `<p style="margin:0 0 16px"><strong>Valor:</strong> ${escapeHtml(input.priceLabel)}</p>` : ""}
     ${input.paymentUrl ? `<div style="margin:8px 0 4px">${renderEmailButton("Pagar agora", input.paymentUrl, "primary")}</div>` : ""}`,
    `Olá, ${firstName}!\n\n${input.tutorName} aceitou sua aula. Agora falta apenas o pagamento para garantir sua vaga.\nTipo: ${typeLabel}\nQuando: ${when}${input.priceLabel ? `\nValor: ${input.priceLabel}` : ""}${input.paymentUrl ? `\nPagar agora: ${input.paymentUrl}` : ""}`,
  );
}

export interface LessonConfirmedTemplateInput {
  recipientName: string;
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  meetingUrl?: string;
  lessonUrl?: string;
  audience: "student" | "tutor";
}

export function buildLessonConfirmedEmail(input: LessonConfirmedTemplateInput): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const firstName = firstDisplayName(input.recipientName);
  const title =
    input.audience === "tutor"
      ? `Aula confirmada com ${input.studentName}`
      : "Sua aula está confirmada";
  const intro =
    input.audience === "tutor"
      ? `Sua aula <strong>${escapeHtml(typeLabel)}</strong> com <strong>${escapeHtml(input.studentName)}</strong> está confirmada na agenda.`
      : `Sua aula <strong>${escapeHtml(typeLabel)}</strong> com <strong>${escapeHtml(input.tutorName)}</strong> está confirmada na agenda.`;
  const ctaUrl = input.lessonUrl;
  const ctaLabel = input.audience === "tutor" ? "Ver aula no painel" : "Ver minha aula";

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">${intro}</p>
     <p style="margin:0 0 8px"><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.meetingUrl ? `<p style="margin:0 0 16px"><strong>Link da aula:</strong> <a href="${escapeHtml(input.meetingUrl)}" style="color:#059669">${escapeHtml(input.meetingUrl)}</a></p>` : ""}
     ${ctaUrl ? `<div style="margin:8px 0 4px">${renderEmailButton(ctaLabel, ctaUrl, "primary")}</div>` : ""}`,
    `Olá, ${firstName}!\n\n${input.audience === "tutor" ? `Sua aula ${typeLabel} com ${input.studentName} está confirmada.` : `Sua aula ${typeLabel} com ${input.tutorName} está confirmada.`}\nQuando: ${when}${input.meetingUrl ? `\nLink da aula: ${input.meetingUrl}` : ""}${ctaUrl ? `\n${ctaLabel}: ${ctaUrl}` : ""}`,
  );
}

export interface TutorProfileIncompleteTemplateInput {
  tutorName: string;
  onboardingUrl?: string;
}

export function buildTutorProfileIncompleteEmail(
  input: TutorProfileIncompleteTemplateInput,
): EmailContent {
  const title = "Complete seu perfil de professor";
  const firstName = firstDisplayName(input.tutorName);

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Você já criou sua conta na Aprendiz Bay. Falta pouco para começar a receber pedidos de aula — complete seu perfil de professor.</p>
     ${input.onboardingUrl ? `<div style="margin:8px 0 4px">${renderEmailButton("Completar perfil", input.onboardingUrl, "primary")}</div>` : ""}`,
    `Olá, ${firstName}!\n\nFalta pouco para começar a receber pedidos de aula — complete seu perfil de professor.${input.onboardingUrl ? `\nCompletar perfil: ${input.onboardingUrl}` : ""}`,
  );
}

export interface TutorVerificationSubmittedTemplateInput {
  tutorName: string;
  dashboardUrl?: string;
}

export function buildTutorVerificationSubmittedEmail(
  input: TutorVerificationSubmittedTemplateInput,
): EmailContent {
  const title = "Documentos enviados para análise";
  const firstName = firstDisplayName(input.tutorName);

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Recebemos seus documentos. Nossa equipe vai analisar seu perfil e avisaremos assim que houver uma atualização.</p>
     ${input.dashboardUrl ? `<div style="margin:8px 0 4px">${renderEmailButton("Acompanhar status", input.dashboardUrl, "primary")}</div>` : ""}`,
    `Olá, ${firstName}!\n\nRecebemos seus documentos. Nossa equipe vai analisar seu perfil e avisaremos assim que houver uma atualização.${input.dashboardUrl ? `\nAcompanhar status: ${input.dashboardUrl}` : ""}`,
  );
}

export interface TutorVerificationApprovedTemplateInput {
  tutorName: string;
  dashboardUrl?: string;
}

export function buildTutorVerificationApprovedEmail(
  input: TutorVerificationApprovedTemplateInput,
): EmailContent {
  const title = "Seu perfil foi aprovado";
  const firstName = firstDisplayName(input.tutorName);

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Ótima notícia: seu perfil de professor foi aprovado pela equipe Aprendiz Bay.</p>
     ${input.dashboardUrl ? `<div style="margin:8px 0 4px">${renderEmailButton("Abrir meu painel", input.dashboardUrl, "primary")}</div>` : ""}`,
    `Olá, ${firstName}!\n\nSeu perfil de professor foi aprovado pela equipe Aprendiz Bay.${input.dashboardUrl ? `\nAbrir meu painel: ${input.dashboardUrl}` : ""}`,
  );
}

export interface TutorProfilePublishedTemplateInput {
  tutorName: string;
  profileUrl?: string;
  dashboardUrl?: string;
}

export function buildTutorProfilePublishedEmail(
  input: TutorProfilePublishedTemplateInput,
): EmailContent {
  const title = "Seu perfil já está no marketplace";
  const firstName = firstDisplayName(input.tutorName);

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Seu perfil já está visível para alunos na Aprendiz Bay. Agora você pode receber pedidos de aula.</p>
     ${input.profileUrl ? `<div style="margin:8px 0 4px">${renderEmailButton("Ver meu perfil público", input.profileUrl, "secondary")}</div>` : ""}
     ${input.dashboardUrl ? `<div style="margin:8px 0 4px">${renderEmailButton("Abrir painel", input.dashboardUrl, "primary")}</div>` : ""}`,
    `Olá, ${firstName}!\n\nSeu perfil já está visível para alunos na Aprendiz Bay.${input.profileUrl ? `\nVer meu perfil público: ${input.profileUrl}` : ""}${input.dashboardUrl ? `\nAbrir painel: ${input.dashboardUrl}` : ""}`,
  );
}

export interface TutorPaymentReceivedTemplateInput {
  tutorName: string;
  studentName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  amountLabel?: string;
  dashboardUrl?: string;
}

export function buildTutorPaymentReceivedEmail(
  input: TutorPaymentReceivedTemplateInput,
): EmailContent {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const firstName = firstDisplayName(input.tutorName);
  const title = `Pagamento confirmado — aula com ${input.studentName}`;

  return wrapEmail(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">Olá, ${escapeHtml(firstName)}!</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155"><strong>${escapeHtml(input.studentName)}</strong> confirmou o pagamento da aula <strong>${escapeHtml(typeLabel)}</strong>.</p>
     <p style="margin:0 0 8px"><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${input.amountLabel ? `<p style="margin:0 0 16px"><strong>Valor:</strong> ${escapeHtml(input.amountLabel)}</p>` : ""}
     ${input.dashboardUrl ? `<div style="margin:8px 0 4px">${renderEmailButton("Ver aula no painel", input.dashboardUrl, "primary")}</div>` : ""}`,
    `Olá, ${firstName}!\n\n${input.studentName} confirmou o pagamento da aula ${typeLabel}.\nQuando: ${when}${input.amountLabel ? `\nValor: ${input.amountLabel}` : ""}${input.dashboardUrl ? `\nVer aula no painel: ${input.dashboardUrl}` : ""}`,
  );
}
