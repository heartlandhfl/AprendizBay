"use strict";

const JETSEND_API_URL = "https://app.jetsend.com/api/v1/transmission/email";
const RESEND_API_URL = "https://api.resend.com/emails";
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const DEFAULT_FROM = "Aprendiz Bay <noreply@aprendizbay.com.br>";
const REMINDER_MIN_MS = 50 * 60 * 1000;
const REMINDER_MAX_MS = 70 * 60 * 1000;

const BOOKING_TYPE_LABELS = {
  individual: "Individual",
  coletivo: "Coletiva",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDatePtBr(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "data a confirmar";
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function bookingTypeLabel(type) {
  return BOOKING_TYPE_LABELS[type] || "Aula";
}

function wrapEmail(title, bodyHtml, bodyText) {
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

function buildPendingBookingEmail(input) {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Nova reserva pendente no Aprendiz Bay";
  const dashboardUrl = input.dashboardUrl || "";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.tutorName)}!</p>
     <p><strong>${escapeHtml(input.studentName)}</strong> solicitou uma aula <strong>${escapeHtml(typeLabel)}</strong>.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     <p>Acesse o painel para confirmar ou recusar a reserva.</p>
     ${dashboardUrl ? `<p><a href="${escapeHtml(dashboardUrl)}" style="color:#059669">Abrir meu painel</a></p>` : ""}`,
    `Olá, ${input.tutorName}!\n\n${input.studentName} solicitou uma aula ${typeLabel}.\nQuando: ${when}\n\nAcesse o painel para confirmar ou recusar a reserva.${dashboardUrl ? `\n${dashboardUrl}` : ""}`,
  );
}

function buildConfirmedBookingEmail(input) {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Sua aula foi confirmada";
  const meetingUrl = input.meetingUrl || "";
  const bookingsUrl = input.bookingsUrl || "";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.studentName)}!</p>
     <p>Sua aula <strong>${escapeHtml(typeLabel)}</strong> com <strong>${escapeHtml(input.tutorName)}</strong> está confirmada.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${meetingUrl ? `<p><strong>Link da aula:</strong> <a href="${escapeHtml(meetingUrl)}" style="color:#059669">${escapeHtml(meetingUrl)}</a></p>` : "<p>O link da aula estará disponível em Minhas aulas.</p>"}
     ${bookingsUrl ? `<p><a href="${escapeHtml(bookingsUrl)}" style="color:#059669">Ver minhas aulas</a></p>` : ""}`,
    `Olá, ${input.studentName}!\n\nSua aula ${typeLabel} com ${input.tutorName} está confirmada.\nQuando: ${when}\n${meetingUrl ? `Link da aula: ${meetingUrl}` : "O link da aula estará disponível em Minhas aulas."}${bookingsUrl ? `\n${bookingsUrl}` : ""}`,
  );
}

function buildLessonReminderEmail(input) {
  const when = formatDatePtBr(input.scheduledAt);
  const typeLabel = bookingTypeLabel(input.bookingType);
  const title = "Lembrete: sua aula começa em 1 hora";
  const meetingUrl = input.meetingUrl || "";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.recipientName)}!</p>
     <p>A aula <strong>${escapeHtml(typeLabel)}</strong> entre <strong>${escapeHtml(input.studentName)}</strong> e <strong>${escapeHtml(input.tutorName)}</strong> começa em cerca de 1 hora.</p>
     <p><strong>Quando:</strong> ${escapeHtml(when)}</p>
     ${meetingUrl ? `<p><strong>Link da aula:</strong> <a href="${escapeHtml(meetingUrl)}" style="color:#059669">${escapeHtml(meetingUrl)}</a></p>` : ""}`,
    `Olá, ${input.recipientName}!\n\nA aula ${typeLabel} entre ${input.studentName} e ${input.tutorName} começa em cerca de 1 hora.\nQuando: ${when}${meetingUrl ? `\nLink da aula: ${meetingUrl}` : ""}`,
  );
}

function buildNewReviewEmail(input) {
  const stars = "★".repeat(Math.max(1, Math.min(5, Number(input.rating) || 0)));
  const title = "Você recebeu uma nova avaliação";
  const comment = String(input.comment || "").trim();
  const dashboardUrl = input.dashboardUrl || "";

  return wrapEmail(
    title,
    `<p>Olá, ${escapeHtml(input.tutorName)}!</p>
     <p><strong>${escapeHtml(input.studentName)}</strong> deixou uma avaliação da aula.</p>
     <p><strong>Nota:</strong> ${escapeHtml(String(input.rating))} ${escapeHtml(stars)}</p>
     ${comment ? `<p><strong>Comentário:</strong> ${escapeHtml(comment)}</p>` : ""}
     ${dashboardUrl ? `<p><a href="${escapeHtml(dashboardUrl)}" style="color:#059669">Abrir meu painel</a></p>` : ""}`,
    `Olá, ${input.tutorName}!\n\n${input.studentName} deixou uma avaliação da aula.\nNota: ${input.rating} ${stars}${comment ? `\nComentário: ${comment}` : ""}${dashboardUrl ? `\n${dashboardUrl}` : ""}`,
  );
}

function resolveFromAddress() {
  return (
    String(process.env.EMAIL_FROM || process.env.RESEND_FROM || "").trim() || DEFAULT_FROM
  );
}

function configuredProvider() {
  if (String(process.env.JETSEND_API_KEY || "").trim()) {
    return "jetsend";
  }
  if (String(process.env.RESEND_API_KEY || "").trim()) {
    return "resend";
  }
  if (String(process.env.SENDGRID_API_KEY || "").trim()) {
    return "sendgrid";
  }
  return null;
}

function resolveJetSendTrackingDomain() {
  return String(process.env.JETSEND_TRACKING_DOMAIN || "").trim();
}

async function sendWithJetSend({ to, subject, text, html, from }) {
  const fromParts = parseFrom(from);
  const options = {
    description: subject,
  };
  const trackingDomain = resolveJetSendTrackingDomain();
  if (trackingDomain) {
    options.tracking_domain = trackingDomain;
  }

  const response = await fetch(JETSEND_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.JETSEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: {
        options,
        recipients: [
          {
            address: {
              email: to,
              name: to.split("@")[0] || to,
            },
          },
        ],
        content: {
          from: {
            name: fromParts.name || "Aprendiz Bay",
            email: fromParts.email,
          },
          subject,
          html,
          text,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`JetSend recusou o e-mail (${response.status}): ${detail.slice(0, 400)}`);
  }

  return { sent: true, provider: "jetsend" };
}

async function sendWithResend({ to, subject, text, html, from }) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend recusou o e-mail (${response.status}): ${detail.slice(0, 400)}`);
  }

  return { sent: true, provider: "resend" };
}

async function sendWithSendGrid({ to, subject, text, html, from }) {
  const response = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: parseFrom(from),
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`SendGrid recusou o e-mail (${response.status}): ${detail.slice(0, 400)}`);
  }

  return { sent: true, provider: "sendgrid" };
}

function parseFrom(from) {
  const match = String(from).match(/^(.*)<([^>]+)>$/);
  if (!match) {
    return { email: from };
  }

  return {
    name: match[1].trim().replace(/^"|"$/g, ""),
    email: match[2].trim(),
  };
}

async function sendEmail({ to, subject, text, html }) {
  const recipient = String(to || "").trim();
  if (!recipient) {
    return { sent: false, skipped: true, reason: "missing_recipient" };
  }

  const provider = configuredProvider();
  if (!provider) {
    console.warn(
      "[Aprendiz Bay] E-mail não enviado: defina JETSEND_API_KEY, RESEND_API_KEY ou SENDGRID_API_KEY.",
    );
    return { sent: false, skipped: true, reason: "missing_api_key" };
  }

  const payload = {
    to: recipient,
    subject,
    text,
    html,
    from: resolveFromAddress(),
  };

  if (provider === "jetsend") {
    return sendWithJetSend(payload);
  }
  return provider === "resend" ? sendWithResend(payload) : sendWithSendGrid(payload);
}

function isWithinLessonReminderWindow(scheduledAt, now) {
  const start = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);
  const current = now instanceof Date ? now : new Date(now);
  const remaining = start.getTime() - current.getTime();
  return remaining > REMINDER_MIN_MS && remaining <= REMINDER_MAX_MS;
}

function toDate(value) {
  if (!value) {
    return new Date(NaN);
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value._seconds === "number") {
    return new Date(value._seconds * 1000);
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return new Date(value);
}

function getSiteUrl() {
  const configured = String(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "";
}

module.exports = {
  BOOKING_TYPE_LABELS,
  DEFAULT_FROM,
  REMINDER_MAX_MS,
  REMINDER_MIN_MS,
  bookingTypeLabel,
  buildConfirmedBookingEmail,
  buildLessonReminderEmail,
  buildNewReviewEmail,
  buildPendingBookingEmail,
  configuredProvider,
  escapeHtml,
  formatDatePtBr,
  getSiteUrl,
  isWithinLessonReminderWindow,
  resolveFromAddress,
  sendEmail,
  toDate,
};
