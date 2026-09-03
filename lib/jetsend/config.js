"use strict";

const JETSEND_API_BASE_URL = "https://app.jetsend.com/api/v1";
const JETSEND_TRANSMISSION_PATH = "/transmission/email";
const JETSEND_SENDING_DOMAIN_PATH = "/sending_domain";

function readJetSendApiKey() {
  return String(process.env.JET_SEND_API_KEY ?? process.env.JETSEND_API_KEY ?? "").trim();
}

function isJetSendConfigured() {
  return Boolean(readJetSendApiKey());
}

function resolveJetSendApiUrl(path) {
  const normalized = String(path).startsWith("/") ? path : `/${path}`;
  return `${JETSEND_API_BASE_URL}${normalized}`;
}

module.exports = {
  JETSEND_API_BASE_URL,
  JETSEND_TRANSMISSION_PATH,
  JETSEND_SENDING_DOMAIN_PATH,
  readJetSendApiKey,
  isJetSendConfigured,
  resolveJetSendApiUrl,
};
