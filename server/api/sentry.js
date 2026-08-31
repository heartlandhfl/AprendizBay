"use strict";

let initialized = false;

function sentryDsn() {
  return String(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "").trim();
}

function initSentry() {
  if (initialized) {
    return getSentry();
  }

  const dsn = sentryDsn();
  if (!dsn) {
    return null;
  }

  const Sentry = require("@sentry/node");
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ||
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      "production",
    sendDefaultPii: false,
  });
  initialized = true;
  return Sentry;
}

function getSentry() {
  if (!initialized) {
    return null;
  }

  return require("@sentry/node");
}

function attachSentry(app) {
  const Sentry = initSentry();
  if (Sentry && typeof Sentry.setupExpressErrorHandler === "function") {
    Sentry.setupExpressErrorHandler(app);
  }
}

function captureException(error) {
  const Sentry = initSentry();
  if (Sentry) {
    Sentry.captureException(error);
  }
}

module.exports = {
  attachSentry,
  captureException,
  initSentry,
  sentryDsn,
};
