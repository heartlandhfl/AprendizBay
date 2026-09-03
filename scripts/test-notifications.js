"use strict";

const assert = require("node:assert/strict");
const {
  buildConfirmedBookingEmail,
  buildLessonReminderEmail,
  buildNewReviewEmail,
  buildPendingBookingEmail,
  configuredProvider,
  escapeHtml,
  formatDatePtBr,
  isWithinLessonReminderWindow,
  sendEmail,
} = require("../lib/notifications/core");
const { isAuthorizedCron } = require("../server/api/notifications");

const scheduledAt = new Date("2026-09-01T14:00:00-03:00");

const pending = buildPendingBookingEmail({
  tutorName: "Mariana Silva",
  studentName: "Ana Souza",
  bookingType: "coletivo",
  scheduledAt,
  dashboardUrl: "https://www.aprendizbay.com.br/tutor/dashboard",
});

assert.match(pending.subject, /Nova reserva pendente/);
assert.match(pending.text, /Ana Souza/);
assert.match(pending.text, /Coletiva/);
assert.match(pending.text, /Mariana Silva/);
assert.doesNotMatch(pending.subject, /pending booking/i);
assert.match(pending.html, /Abrir meu painel/);

const confirmed = buildConfirmedBookingEmail({
  studentName: "Ana Souza",
  tutorName: "Mariana Silva",
  bookingType: "individual",
  scheduledAt,
  meetingUrl: "https://meet.jit.si/aprendizbay-aula-1",
  bookingsUrl: "https://www.aprendizbay.com.br/bookings",
});

assert.match(confirmed.subject, /Pagamento confirmado/);
assert.match(confirmed.text, /Recebemos o pagamento/);
assert.doesNotMatch(confirmed.subject, /pending booking/i);
assert.match(confirmed.html, /Ver comprovante/);

const reminder = buildLessonReminderEmail({
  recipientName: "Ana Souza",
  studentName: "Ana Souza",
  tutorName: "Mariana Silva",
  bookingType: "individual",
  scheduledAt,
  meetingUrl: "https://meet.jit.si/aprendizbay-aula-1",
});

assert.match(reminder.subject, /começa em 1 hora/);
assert.match(reminder.text, /cerca de 1 hora/);
assert.match(reminder.html, /meet\.jit\.si/);

const review = buildNewReviewEmail({
  tutorName: "Mariana Silva",
  studentName: "Ana Souza",
  rating: 5,
  comment: "<script>alert(1)</script>Ótima aula",
  dashboardUrl: "https://www.aprendizbay.com.br/tutor/dashboard",
});

assert.match(review.subject, /nova avaliação/);
assert.match(review.text, /5/);
assert.match(review.html, /&lt;script&gt;/);
assert.doesNotMatch(review.html, /<script>alert/);

assert.equal(escapeHtml("<b>x</b>"), "&lt;b&gt;x&lt;/b&gt;");
assert.match(formatDatePtBr(scheduledAt), /2026|setembro|set\./i);

const now = new Date("2026-09-01T13:00:00-03:00");
assert.equal(isWithinLessonReminderWindow(scheduledAt, now), true);
assert.equal(
  isWithinLessonReminderWindow(scheduledAt, new Date("2026-09-01T12:00:00-03:00")),
  false,
);
assert.equal(
  isWithinLessonReminderWindow(scheduledAt, new Date("2026-09-01T13:40:00-03:00")),
  false,
);

async function main() {
  const previousJetSend = process.env.JETSEND_API_KEY;
  const previousKey = process.env.RESEND_API_KEY;
  const previousSendgrid = process.env.SENDGRID_API_KEY;
  const previousEmailEnv = process.env.EMAIL_ENV;
  process.env.EMAIL_ENV = "production";
  delete process.env.JETSEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.SENDGRID_API_KEY;
  assert.equal(configuredProvider(), null);

  const skipped = await sendEmail({
    to: "tutor@example.com",
    subject: pending.subject,
    text: pending.text,
    html: pending.html,
  });
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.reason, "missing_api_key");

  process.env.JETSEND_API_KEY = "sm_test";
  const originalFetch = globalThis.fetch;
  const jetSendCalls = [];
  globalThis.fetch = async (url, options) => {
    jetSendCalls.push({ url, options });
    return { ok: true, text: async () => "" };
  };

  const jetSendSent = await sendEmail({
    to: "tutor@example.com",
    subject: pending.subject,
    text: pending.text,
    html: pending.html,
  });
  assert.equal(jetSendSent.sent, true);
  assert.equal(jetSendSent.provider, "jetsend");
  assert.equal(jetSendCalls[0].url, "https://app.jetsend.com/api/v1/transmission/email");
  assert.match(String(jetSendCalls[0].options.headers.Authorization), /Bearer sm_test/);
  assert.match(String(jetSendCalls[0].options.body), /Nova reserva pendente/);
  assert.match(String(jetSendCalls[0].options.body), /noreply@aprendizbay\.com\.br/);

  delete process.env.JETSEND_API_KEY;
  process.env.RESEND_API_KEY = "re_test";
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, text: async () => "" };
  };

  const sent = await sendEmail({
    to: "tutor@example.com",
    subject: pending.subject,
    text: pending.text,
    html: pending.html,
  });
  assert.equal(sent.sent, true);
  assert.equal(sent.provider, "resend");
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.match(String(calls[0].options.body), /Nova reserva pendente/);

  globalThis.fetch = originalFetch;
  if (previousJetSend) {
    process.env.JETSEND_API_KEY = previousJetSend;
  } else {
    delete process.env.JETSEND_API_KEY;
  }
  if (previousKey) {
    process.env.RESEND_API_KEY = previousKey;
  } else {
    delete process.env.RESEND_API_KEY;
  }
  if (previousSendgrid) {
    process.env.SENDGRID_API_KEY = previousSendgrid;
  }
  if (previousEmailEnv) {
    process.env.EMAIL_ENV = previousEmailEnv;
  } else {
    delete process.env.EMAIL_ENV;
  }

  const previousSecret = process.env.NOTIFICATIONS_CRON_SECRET;
  process.env.NOTIFICATIONS_CRON_SECRET = "segredo-teste";
  assert.equal(isAuthorizedCron({ get: () => "Bearer segredo-teste" }), true);
  assert.equal(isAuthorizedCron({ get: () => "Bearer outro" }), false);
  if (previousSecret === undefined) {
    delete process.env.NOTIFICATIONS_CRON_SECRET;
  } else {
    process.env.NOTIFICATIONS_CRON_SECRET = previousSecret;
  }

  console.log("notification unit checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
