"use strict";

const VALID_EMAIL_ENVS = new Set(["development", "staging", "production"]);

const JETSEND_PRODUCTION_API_URL = "https://app.jetsend.com/api/v1/transmission/email";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveEmailEnv() {
  const explicit = String(process.env.EMAIL_ENV ?? "").trim().toLowerCase();
  if (VALID_EMAIL_ENVS.has(explicit)) {
    return explicit;
  }

  const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
  if (vercelEnv === "production") {
    return "production";
  }
  if (vercelEnv === "preview") {
    return "staging";
  }

  return "development";
}

function readTestRecipient() {
  return String(process.env.EMAIL_TEST_RECIPIENT ?? "").trim();
}

function readStagingAllowlist() {
  return String(process.env.EMAIL_STAGING_ALLOWLIST ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmailAddress(value) {
  return String(value ?? "").trim().toLowerCase();
}

function environmentSubjectPrefix(emailEnv) {
  return emailEnv === "development" ? "[TEST]" : "[STAGING]";
}

function prefixSubject(emailEnv, subject) {
  const prefix = environmentSubjectPrefix(emailEnv);
  const value = String(subject ?? "").trim();
  if (!value) {
    return prefix;
  }
  if (value.startsWith(`${prefix} `) || value.startsWith(prefix)) {
    return value;
  }
  return `${prefix} ${value}`;
}

function buildEnvironmentBanner(emailEnv, originalRecipient) {
  const label = emailEnv === "development" ? "TESTE" : "STAGING";
  const safeRecipient = escapeHtml(originalRecipient);

  return {
    text: `\n\n---\nAmbiente ${label}. Destinatário original: ${originalRecipient}\n---\n`,
    html: `<p style="margin:16px 0;padding:12px;background:#fef3c7;border-left:4px solid #f59e0b;font-size:13px"><strong>Ambiente ${label}.</strong> Destinatário original: ${safeRecipient}</p>`,
  };
}

function applyEmailEnvironmentGuards(input) {
  const emailEnv = resolveEmailEnv();
  if (emailEnv === "production") {
    return { message: input };
  }

  const originalRecipient = String(input.to ?? "").trim();
  const testRecipient = readTestRecipient();

  if (emailEnv === "development") {
    if (!testRecipient) {
      return {
        skipped: {
          sent: false,
          skipped: true,
          reason: "missing_test_recipient",
        },
      };
    }

    const banner = buildEnvironmentBanner(emailEnv, originalRecipient);
    return {
      message: {
        ...input,
        to: testRecipient,
        subject: prefixSubject(emailEnv, input.subject),
        text: `${String(input.text ?? "")}${banner.text}`,
        html: `${String(input.html ?? "")}${banner.html}`,
      },
    };
  }

  const allowlist = readStagingAllowlist();
  const normalizedRecipient = normalizeEmailAddress(originalRecipient);
  const isAllowlisted = allowlist.includes(normalizedRecipient);
  const deliveryRecipient = isAllowlisted ? originalRecipient : testRecipient;

  if (!deliveryRecipient) {
    return {
      skipped: {
        sent: false,
        skipped: true,
        reason: "recipient_not_allowed_in_staging",
      },
    };
  }

  const banner = isAllowlisted
    ? { text: "", html: "" }
    : buildEnvironmentBanner(emailEnv, originalRecipient);

  return {
    message: {
      ...input,
      to: deliveryRecipient,
      subject: prefixSubject(emailEnv, input.subject),
      text: `${String(input.text ?? "")}${banner.text}`,
      html: `${String(input.html ?? "")}${banner.html}`,
    },
  };
}

function resolveJetSendTransmissionApiUrl() {
  const explicit = String(process.env.JETSEND_TRANSMISSION_API_URL ?? "").trim();
  if (explicit) {
    return explicit;
  }

  const stagingOverride = String(process.env.JETSEND_STAGING_API_URL ?? "").trim();
  if (resolveEmailEnv() === "staging" && stagingOverride) {
    return stagingOverride;
  }

  return JETSEND_PRODUCTION_API_URL;
}

function wrapEmailProviderWithEnvironmentGuards(provider) {
  return {
    async send(input) {
      const guarded = applyEmailEnvironmentGuards(input);
      if (guarded.skipped) {
        return guarded.skipped;
      }
      return provider.send(guarded.message);
    },
  };
}

module.exports = {
  JETSEND_PRODUCTION_API_URL,
  applyEmailEnvironmentGuards,
  resolveEmailEnv,
  resolveJetSendTransmissionApiUrl,
  wrapEmailProviderWithEnvironmentGuards,
};
