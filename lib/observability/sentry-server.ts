import * as Sentry from "@sentry/node";
import { serverSentryDsn } from "@/lib/observability/config";

let initialized = false;

export function initServerSentry(): boolean {
  if (initialized) {
    return true;
  }

  const dsn = serverSentryDsn();
  if (!dsn) {
    return false;
  }

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
  return true;
}

export function captureServerException(error: unknown): void {
  if (!initServerSentry()) {
    return;
  }

  Sentry.captureException(error);
}
