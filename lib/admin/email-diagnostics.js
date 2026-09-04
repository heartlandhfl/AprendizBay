"use strict";

const { resolveEmailEnv } = require("../email/environment.js");
const { isJetSendConfigured, readJetSendApiKey } = require("../jetsend/config.js");

function readJetSendKeyPrefix() {
  const key = readJetSendApiKey();
  if (!key) {
    return null;
  }
  return key.slice(0, 4);
}

function buildEmailDiagnosticsPayload() {
  return {
    emailProvider: process.env.EMAIL_PROVIDER ?? null,
    jetsendConfigured: isJetSendConfigured(),
    jetsendKeyPrefix: readJetSendKeyPrefix(),
    resolvedEmailEnv: resolveEmailEnv(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    runtime: process.env.APRENDIZ_RUNTIME ?? "next",
  };
}

module.exports = {
  buildEmailDiagnosticsPayload,
};
