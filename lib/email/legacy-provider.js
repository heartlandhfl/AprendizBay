"use strict";

const RESEND_API_URL = "https://api.resend.com/emails";
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const DEFAULT_FROM = "Aprendiz Bay <noreply@aprendizbay.com.br>";

function resolveFromAddress() {
  return (
    String(process.env.EMAIL_FROM || process.env.RESEND_FROM || "").trim() || DEFAULT_FROM
  );
}

function configuredProvider() {
  if (String(process.env.RESEND_API_KEY || "").trim()) {
    return "resend";
  }
  if (String(process.env.SENDGRID_API_KEY || "").trim()) {
    return "sendgrid";
  }
  return null;
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

async function sendEmail({ to, subject, text, html, from }) {
  const recipient = String(to || "").trim();
  if (!recipient) {
    return { sent: false, skipped: true, reason: "missing_recipient" };
  }

  const provider = configuredProvider();
  if (!provider) {
    console.warn(
      "[Aprendiz Bay] E-mail não enviado: defina RESEND_API_KEY ou SENDGRID_API_KEY.",
    );
    return { sent: false, skipped: true, reason: "missing_api_key" };
  }

  const payload = {
    to: recipient,
    subject,
    text,
    html,
    from: from || resolveFromAddress(),
  };

  return provider === "resend" ? sendWithResend(payload) : sendWithSendGrid(payload);
}

module.exports = {
  DEFAULT_FROM,
  configuredProvider,
  resolveFromAddress,
  sendEmail,
};
